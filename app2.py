from flask import Flask, request, jsonify
import csv, os, time
from datetime import datetime

app = Flask(__name__)
CSV_FILE = "results.csv"

# 初始化表头
if not os.path.exists(CSV_FILE):
    with open(CSV_FILE, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "ip", "province", "name", "social_class", "timestamp"])

def classify(income):
    if income == "low":
        return "working_class"
    elif income == "middle":
        return "middle_class"
    elif income == "high":
        return "capitalist_class"
    else:
        return "unknown"

@app.route('/submit', methods=['POST'])
def submit():
    data = request.json
    user_id = int(time.time() * 1000)  # 用毫秒级时间戳作为内部编号
    ip = data.get("ip", "")
    province = data.get("province", "")
    name = data.get("name", "")
    income = data.get("income", "")
    social_class = classify(income)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 写入 CSV
    with open(CSV_FILE, mode="a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([user_id, ip, province, name, social_class, timestamp])

    return jsonify({
        "status": "success",
        "id": user_id,
        "social_class": social_class,
        "timestamp": timestamp
    })

if __name__ == '__main__':
    app.run(debug=True)