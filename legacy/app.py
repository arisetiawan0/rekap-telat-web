from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    send_file,
)
import os
import math
from io import BytesIO
from datetime import datetime
from zoneinfo import ZoneInfo

import pandas as pd

# ==========================
# APP SETUP
# ==========================
app = Flask(__name__)
app.secret_key = "ganti_ini_dengan_string_random_yang_agak_panjang"

ALLOWED_EXTENSIONS = {"xlsx"}
ROWS_PER_PAGE = 50
TIMEZONE = "Asia/Makassar"
DEFAULT_WORK_START = "08:00"

# Simpan hasil terakhir untuk preview & download
last_rekap_rows: list[dict] = []

# ==========================
# UTIL
# ==========================
def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def find_column(df, candidates):
    for c in candidates:
        if c in df.columns:
            return c
    return None


def parse_time(val):
    if pd.isna(val):
        return None
    try:
        return pd.to_datetime(val).time()
    except Exception:
        return None


# ==========================
# CORE LOGIC (PANDAS)
# ==========================
def process_absensi_dataframe(df: pd.DataFrame) -> list[dict]:
    name_col = find_column(df, ["Full Name", "Employee Name", "Name", "Nama"])
    date_col = find_column(df, ["Date*", "Date", "Attendance Date", "Tanggal"])
    checkin_col = find_column(df, ["Check In", "Clock In", "In Time", "Jam Masuk"])
    schedule_in_col = find_column(df, ["Schedule In", "Shift In", "Jam Masuk Jadwal"])
    schedule_out_col = find_column(df, ["Schedule Out", "Shift Out", "Jam Pulang Jadwal"])
    checkout_col = find_column(df, ["Check Out", "Clock Out", "Out Time", "Jam Pulang"])

    if not name_col or not checkin_col:
        raise ValueError("Kolom wajib (Nama / Check In) tidak ditemukan")

    df[name_col] = df[name_col].astype(str).str.strip()
    df = df[(df[name_col] != "") & (df[name_col].str.lower() != "nan")]

    df["CheckInTime"] = df[checkin_col].apply(parse_time)
    df["ScheduleInTime"] = (
        df[schedule_in_col].apply(parse_time)
        if schedule_in_col else None
    )

    default_start = datetime.strptime(DEFAULT_WORK_START, "%H:%M").time()

    def calc_late(row):
        t_in = row["CheckInTime"]
        sched = row["ScheduleInTime"] or default_start
        if not t_in or not sched:
            return 0
        dt_in = datetime.combine(datetime.today(), t_in)
        dt_std = datetime.combine(datetime.today(), sched)
        diff = (dt_in - dt_std).total_seconds() / 60
        return int(diff) if diff > 0 else 0

    df["LateMinutes"] = df.apply(calc_late, axis=1)
    df = df[df["LateMinutes"] > 0]

    if df.empty:
        return []

    rekap = (
        df.groupby(name_col)["LateMinutes"]
        .count()
        .reset_index(name="Total_Keterlambatan")
    )

    df = df.merge(rekap, on=name_col, how="left")

    result = []
    for _, r in df.iterrows():
        result.append({
            "Full Name": r[name_col],
            "Date": r[date_col] if date_col else "",
            "Check In": r[checkin_col],
            "Check Out": r[checkout_col] if checkout_col else "",
            "Late (Minutes)": r["LateMinutes"],
            "Total_Keterlambatan": r["Total_Keterlambatan"],
        })

    result.sort(key=lambda x: (x["Full Name"].lower(), x["Date"]))
    return result


# ==========================
# SUMMARY / FILTER / PAGINATION
# ==========================
def hitung_ringkasan(rows: list[dict]) -> dict:
    total_cases = len(rows)
    if total_cases == 0:
        return {
            "total_cases": 0,
            "total_employees": 0,
            "avg_per_employee": 0,
            "top5": [],
        }

    counts = {}
    for r in rows:
        name = r["Full Name"]
        counts[name] = max(counts.get(name, 0), r["Total_Keterlambatan"])

    total_employees = len(counts)
    avg_per_employee = total_cases / total_employees if total_employees else 0

    top5 = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]
    return {
        "total_cases": total_cases,
        "total_employees": total_employees,
        "avg_per_employee": round(avg_per_employee, 2),
        "top5": [{"name": n, "count": c} for n, c in top5],
    }


def filter_rows(rows, q):
    if not q:
        return rows
    q = q.lower()
    return [r for r in rows if q in r["Full Name"].lower()]


def paginate_rows(rows, page, per_page=ROWS_PER_PAGE):
    total = len(rows)
    total_pages = max(1, math.ceil(total / per_page))
    page = max(1, min(page, total_pages))
    start = (page - 1) * per_page
    end = start + per_page
    return rows[start:end], {
        "page": page,
        "total_pages": total_pages,
        "total": total,
        "start_index": start + 1 if total else 0,
        "end_index": min(end, total),
    }


# ==========================
# ROUTES
# ==========================
@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/process", methods=["POST"])
def process():
    global last_rekap_rows

    if "file" not in request.files:
        flash("File tidak ditemukan.")
        return redirect(url_for("index"))

    file = request.files["file"]
    if file.filename == "":
        flash("Silakan pilih file .xlsx")
        return redirect(url_for("index"))

    if not allowed_file(file.filename):
        flash("Format file harus .xlsx")
        return redirect(url_for("index"))

    try:
        df = pd.read_excel(file)
        last_rekap_rows = process_absensi_dataframe(df)
    except Exception as e:
        flash(f"Gagal memproses file: {e}")
        return redirect(url_for("index"))

    if not last_rekap_rows:
        flash("Tidak ada data keterlambatan.")
        return redirect(url_for("index"))

    return redirect(url_for("preview", page=1))


@app.route("/preview", methods=["GET"])
def preview():
    if not last_rekap_rows:
        flash("Belum ada data.")
        return redirect(url_for("index"))

    q = request.args.get("q", "", type=str)
    page = request.args.get("page", 1, type=int)

    filtered = filter_rows(last_rekap_rows, q)
    paged, page_info = paginate_rows(filtered, page)
    summary = hitung_ringkasan(filtered)

    return render_template(
        "preview.html",
        rows=paged,
        summary=summary,
        page_info=page_info,
        q=q,
    )


@app.route("/download", methods=["GET"])
def download():
    if not last_rekap_rows:
        flash("Belum ada data.")
        return redirect(url_for("index"))

    df = pd.DataFrame(last_rekap_rows)
    output = BytesIO()
    df.to_excel(output, index=False)
    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name="rekap_telat.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
