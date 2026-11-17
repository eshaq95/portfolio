"""Build the project figures and chart data for the portfolio from my GitHub repos.

Every image comes from a repo (a notebook output, a report or poster, or a screenshot)
and every number in projects-data.js is read from a repo file or copied from its report.

Usage:
    1. Clone these repos into one folder, keeping their GitHub names:
       OpenCV-Runescape-MiningAI, MATLAB-projects, Dissertation-ML-vs-Technical-Analysis-,
       Text-Categorization-NLP-Newsgrouping, Time-Series-Forecasting-Ambulance-Service-Calls,
       Car-Insurance-Prediction-ML, Credit-Risk-Scoring-Project,
       commercial-analytics-dashboard, GarbageSorting-WebGame
    2. From the portfolio folder, run:
       python3 tools/build_project_assets.py path/to/that/folder

Needs Python 3 with Pillow (with WebP support) and poppler-utils (pdfimages, pdftoppm).
"""
import base64
import csv
import collections
import datetime
import io
import json
import os
import re
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw

if len(sys.argv) != 2:
    sys.exit(__doc__)

REPOS = sys.argv[1]
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(SITE, "assets", "projects")
os.makedirs(OUT, exist_ok=True)
TMP = tempfile.mkdtemp()


def repo(*parts):
    return os.path.join(REPOS, *parts)


def save_webp(im, name, max_w, quality=82):
    im = im.convert("RGB")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    path = os.path.join(OUT, name)
    im.save(path, "WEBP", quality=quality, method=6)
    print(f"{name}: {im.width} x {im.height}, {os.path.getsize(path) // 1024} KB")


def pdf_page_image(pdf, page, index):
    """Return the index-th image (smasks included in the count) that pdfimages finds on a page."""
    prefix = os.path.join(TMP, f"p{page}")
    subprocess.run(["pdfimages", "-png", "-f", str(page), "-l", str(page), pdf, prefix], check=True)
    return Image.open(f"{prefix}-{index:03d}.png")


def notebook(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def cell_text(nb, cell):
    text = ""
    for o in nb["cells"][cell].get("outputs", []):
        if o.get("output_type") == "stream":
            text += "".join(o.get("text", ""))
        elif "text/plain" in o.get("data", {}):
            text += "".join(o["data"]["text/plain"])
    return text


def cell_png(nb, cell):
    for o in nb["cells"][cell].get("outputs", []):
        if "image/png" in o.get("data", {}):
            return Image.open(io.BytesIO(base64.b64decode(o["data"]["image/png"])))
    raise ValueError(f"no image in cell {cell}")


# ---------- Figures ----------

# Vision agent: the game area of the agent's processed frame, with its detections marked.
shot = Image.open(repo("OpenCV-Runescape-MiningAI", "Images", "screenShot.png")).convert("RGB")
px = shot.load()
W, H = shot.size


def nonblack(x, y):
    return sum(px[x, y]) > 45


rows = [y for y in range(45, H - 3) if sum(nonblack(x, y) for x in range(10, W - 10, 4)) > 20]
cols = [x for x in range(4, W - 4) if sum(nonblack(x, y) for y in range(45, H - 3, 4)) > 20]
save_webp(shot.crop((min(cols), min(rows), max(cols) + 1, max(rows) + 1)), "vision-game.webp", 960, quality=88)

# Turbine: the original MATLAB output.
save_webp(Image.open(repo("MATLAB-projects", "1. Bladeoptimization", "Output.png")), "turbine-matlab.webp", 1100)

# Dissertation: Figure 9, log cumulative returns of the best rules against buy and hold on the test set (page 38).
save_webp(pdf_page_image(repo("Dissertation-ML-vs-Technical-Analysis-", "report", "Report.pdf"), 38, 0),
          "trading-rules-test.webp", 1100)

# Text classification: word clouds for each newsgroup (notebook cell 36).
text_nb = notebook(repo("Text-Categorization-NLP-Newsgrouping", "code", "groupCode_G3.ipynb"))
save_webp(cell_png(text_nb, 36), "text-wordclouds.webp", 828, quality=85)

# Ambulance: the A2 poster, with the student number taken out of the byline and the name re-centred.
def poster_without_number(pdf):
    base = os.path.join(TMP, "poster")
    subprocess.run(["pdftoppm", "-r", "100", "-png", "-singlefile", pdf, base], check=True)
    im = Image.open(base + ".png").convert("RGB")
    xml = subprocess.run(["pdftotext", "-bbox", "-f", "1", "-l", "1", pdf, "-"],
                         capture_output=True, text=True, check=True).stdout
    words = [(float(a), float(b), float(c), float(d), w) for a, b, c, d, w in re.findall(
        r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', xml)]
    number = next(w for w in words if re.fullmatch(r"\d{8}", w[4]))
    byline = [w for w in words if abs(w[1] - number[1]) < 1]
    name = [w for w in byline if w[4] in ("Eshaq", "Rahmani")]
    scale = 100 / 72  # PDF points to pixels at 100 dpi

    def box(x0, x1):
        return (round(x0 * scale) - 2, round(number[1] * scale) - 2, round(x1 * scale) + 2, round(number[3] * scale) + 3)

    whole = box(min(w[0] for w in byline), max(w[2] for w in byline))
    name_box = box(min(w[0] for w in name), max(w[2] for w in name))
    name_img = im.crop(name_box)
    background = im.getpixel((whole[2] + 8, (whole[1] + whole[3]) // 2))
    ImageDraw.Draw(im).rectangle(whole, fill=background)
    im.paste(name_img, ((whole[0] + whole[2] - name_img.width) // 2, name_box[1]))
    return im


save_webp(poster_without_number(repo("Time-Series-Forecasting-Ambulance-Service-Calls", "poster", "Final_poster.pdf")),
          "ambulance-poster.webp", 1200, quality=84)

# Credit risk: ROC curves of the four scorecards (report page 40).
save_webp(pdf_page_image(repo("Credit-Risk-Scoring-Project", "report", "Credit Risk Report.pdf"), 40, 2),
          "credit-roc.webp", 644, quality=88)

# Commercial analytics: the Tableau executive dashboard.
save_webp(Image.open(repo("commercial-analytics-dashboard", "Executive Dashboard.png")), "dashboard-exec.webp", 1000)

# Educational game: a gameplay screenshot.
save_webp(Image.open(repo("GarbageSorting-WebGame", "frontend", "img", "jietu2.jpg")), "game-play.webp", 900)

# ---------- Chart data ----------

data = {}

# Ambulance calls, cleaned as in the R code: rows with a missing call time are removed, and
# calls are grouped into weeks with format(date, "%Y-%U"), in order of first appearance.
calls = []
with open(repo("Time-Series-Forecasting-Ambulance-Service-Calls", "data", "Call data.csv"), encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        d, t = (r.get("Date_Incoming_call") or "").strip(), (r.get("Incoming_Call_Time") or "").strip()
        if d:
            calls.append((datetime.datetime.strptime(d, "%d/%m/%Y").date(), t))
complete = [(d, t) for d, t in calls if t]
order, weekly = [], collections.Counter()
for d, _ in complete:
    key = d.strftime("%Y-%U")
    if key not in weekly:
        order.append(key)
    weekly[key] += 1


def week_start(key):
    year, week = map(int, key.split("-"))
    jan1 = datetime.date(year, 1, 1)
    if week == 0:
        return jan1
    first_sunday = jan1 + datetime.timedelta(days=(6 - jan1.weekday()) % 7)
    return first_sunday + datetime.timedelta(weeks=week - 1)


hours = collections.Counter(int(t.split(":")[0]) for _, t in complete)
weekdays = collections.Counter(d.weekday() for d, _ in complete)  # Monday is 0
data["ambulance"] = {
    "calls": len(calls),
    "used": len(complete),
    "weeks": [[week_start(k).isoformat(), weekly[k]] for k in order],
    "hour": [hours[h] for h in range(24)],
    "weekday": [weekdays[i] for i in range(7)],
    # TBATS forecast for weeks 300 to 307 (data/Prediction results for 8 Weeks.xlsx).
    "forecastStart": "2022-10-24",
    "forecast": [4.317445, 4.790053, 5.196109, 5.542758, 5.837262, 6.086536, 6.296913, 6.474053],
}

# Car insurance: share of customers interested (Result = 1) in each group.
with open(repo("Car-Insurance-Prediction-ML", "data", "CW1_data_202223.csv"), encoding="utf-8-sig") as f:
    records = list(csv.DictReader(f))


def age_band(value):
    if not value:
        return ""
    age = int(value)
    for upper, band in ((30, "20 to 29"), (40, "30 to 39"), (50, "40 to 49"), (60, "50 to 59")):
        if age < upper:
            return band
    return "60 and over"


features = [
    ("PastAccident", "Past accident", lambda r: r["PastAccident"], ["Yes", "No", ""]),
    ("VehicleAge", "Vehicle age", lambda r: r["VehicleAge"], ["< 1 Year", "1-2 Year", "> 2 Years", ""]),
    ("Switch", "Switch flag", lambda r: r["Switch"], ["1", "0", ""]),
    ("Age", "Age", lambda r: age_band(r["Age"]),
     ["20 to 29", "30 to 39", "40 to 49", "50 to 59", "60 and over", ""]),
    ("Gender", "Gender", lambda r: r["Gender"], ["Female", "Male", ""]),
]
# The notebook treats Switch = 1 as yes and 0 as no.
names = {"< 1 Year": "Under 1 year", "1-2 Year": "1 to 2 years", "> 2 Years": "Over 2 years",
         "1": "Yes", "0": "No", "": "Not recorded"}
car = {
    "rows": len(records),
    "interested": sum(r["Result"] == "1" for r in records),
    "features": [],
    # Best tuned models, from the repo README: PR-AUC, ROC-AUC, Cohen's kappa.
    "models": [
        ["XGBoost", 0.600, 0.775, 0.248],
        ["Random forest", 0.559, 0.763, 0.288],
        ["K-nearest neighbours", 0.502, 0.718, 0.256],
    ],
}
for key, name, get, groups in features:
    n, k = collections.Counter(), collections.Counter()
    for r in records:
        g = get(r)
        n[g] += 1
        k[g] += r["Result"] == "1"
    car["features"].append({"key": key, "name": name,
                            "groups": [[names.get(g, g), n[g], k[g]] for g in groups if n[g]]})
data["car"] = car


# Text classification: per-class precision, recall and F1 from the notebook's classification
# reports (cells 50, 117, 133 and 143, the runs behind the results table in the README).
def classification_report(cell):
    classes, summary = [], {}
    for line in cell_text(text_nb, cell).splitlines():
        m = re.match(r"^\s*([a-z.\-]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s*$", line)
        if m:
            classes.append([m.group(1), float(m.group(2)), float(m.group(3)), float(m.group(4))])
        m = re.match(r"^\s*accuracy\s+([\d.]+)\s+\d+", line)
        if m:
            summary["accuracy"] = float(m.group(1))
        m = re.match(r"^\s*macro avg\s+[\d.]+\s+[\d.]+\s+([\d.]+)", line)
        if m:
            summary["macroF1"] = float(m.group(1))
    assert len(classes) == 20, (cell, len(classes))
    return {"classes": classes, **summary}


data["text"] = {"models": [
    {"name": "Naive Bayes", **classification_report(50)},
    {"name": "LSTM", **classification_report(117)},
    {"name": "CNN", **classification_report(133)},
    {"name": "BERT", **classification_report(143)},
]}

# Dissertation: test-period results (report Tables 9, 10 and 11) and White's Reality Check
# p-values (Table 8).
data["trading"] = {
    # name, kind, annualised return %, cumulative return %
    "test": [
        ["LSTM, RSI and MACD", "ml", 138.40, 780.60],
        ["LSTM, all four indicators", "ml", 81.72, 335.75],
        ["RSI rule (RSI2)", "rule", 80.32, 404.78],
        ["MACD rule (MACD2)", "rule", 62.46, 279.06],
        ["SVM, RSI and MACD", "ml", 27.19, 91.57],
        ["Bollinger Bands rule (BB2)", "rule", 11.61, 35.20],
        ["LSTM, Bollinger Bands and MA", "ml", 6.92, 17.93],
        ["SVM, all four indicators", "ml", -1.80, -4.78],
        ["Moving average rule (MA1)", "rule", -6.64, -17.21],
        ["Buy and hold", "benchmark", -8.63, -21.94],
        ["SVM, Bollinger Bands and MA", "ml", -19.54, -44.43],
    ],
    # rule, p-value for Sharpe ratio, annualised return and cumulative return
    "wrc": [
        ["MA1", 0.107, 1.000, 1.000],
        ["MACD2", 0.039, 1.000, 1.000],
        ["BB2", 0.175, 0.998, 0.998],
        ["RSI2", 0.092, 1.000, 1.000],
    ],
}

with open(os.path.join(SITE, "projects-data.js"), "w", encoding="utf-8") as f:
    f.write("// Generated by tools/build_project_assets.py from my GitHub repos. Do not edit by hand.\n")
    f.write("window.PROJECT_DATA = " + json.dumps(data, separators=(",", ":")) + ";\n")
print("projects-data.js written")
