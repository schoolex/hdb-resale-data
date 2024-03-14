from datetime import datetime, timedelta
import requests
import pandas as pd
import json


def download_csv():
    api_url = "https://api-production.data.gov.sg/v2/internal/api/datasets/d_8b84c4ee58e3cfc0ece0d773c8ca6abc/initiate-download"

    headers = {
        "accept": "*/*",
        "accept-language": "en-GB,en;q=0.9",
        "content-type": "application/json",
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
    }

    payload = {"headers": {"x-dgs-admin-api-key": ""}}

    print("Obtain download link....")
    response = requests.post(api_url, headers=headers, json=payload)
    data = response.json()
    csv_url = data["url"]
    print("Downloading CSV...")
    csv_content = requests.get(csv_url).text
    print("Saving CSV...")
    with open("output.csv", "w") as f:
        f.write(csv_content)


def get_df(path):
    print("Reading CSV...")
    df = pd.read_csv(path)
    print("Processing CSV...")

    df["resale_price"] = df["resale_price"].astype(int)
    df["psf"] = df["resale_price"] / (df["floor_area_sqm"] * 10.7689)
    return df


def write_to_json(data, filename):
    print(f"Writing to {filename}")
    with open(filename, "w") as f:
        json.dump(data, f)


def process_csv(path):
    df = get_df(path)
    last_12_months = (datetime.now() - timedelta(days=365)).strftime('%Y-%m')

    df = df[df["month"] >= last_12_months]
    # Drop records where flat_type equals '2 ROOM'
    df = df[df["flat_type"] != '2 ROOM']

    # Aggregation without lease_commence_date filter
    results_without_filter = (
        df.groupby(["month", "town", "flat_type"])
        .agg(
            {
                "resale_price": ["mean", "count", "max", "min"],
                "psf": ["mean", "max", "min"],
            }
        )
        .to_dict("index")
    )

    # Aggregation with lease_commence_date filter
    df = df[df["lease_commence_date"] >= 1990]
    results_with_filter = (
        df.groupby(["month", "town", "flat_type"])
        .agg(
            {
                "resale_price": ["mean", "count", "max", "min"],
                "psf": ["mean", "max", "min"],
            }
        )
        .to_dict("index")
    )

    # Process results
    averages = process_results(results_without_filter, results_with_filter)

    # Write to json
    write_to_json(averages, "averages2.json")


def process_results(results_without_filter, results_with_filter):
    averages = {}
    for key, value in results_without_filter.items():
        month, town, flat_type = key
        average = round(value.get(("resale_price", "mean"), 0))
        count = value.get(("resale_price", "count"), 0)
        max_price = value.get(("resale_price", "max"), 0)
        min_price = value.get(("resale_price", "min"), 0)
        avg_psf = round(value.get(("psf", "mean"), 0))
        if count > 0:
            if month not in averages:
                averages[month] = {}
            if town not in averages[month]:
                averages[month][town] = {}
            averages[month][town][flat_type] = {
                "all": {
                    "count": count,
                    "avg_price": average,
                    "max_price": max_price,
                    "min_price": min_price,
                    "avg_psf": avg_psf,
                }
            }

    for key, value in results_with_filter.items():
        month, town, flat_type = key
        average = round(value.get(("resale_price", "mean"), 0))
        count = value.get(("resale_price", "count"), 0)
        max_price = value.get(("resale_price", "max"), 0)
        min_price = value.get(("resale_price", "min"), 0)
        avg_psf = round(value.get(("psf", "mean"), 0))
        if count > 0:
            if month not in averages:
                averages[month] = {}
            if town not in averages[month]:
                averages[month][town] = {}
            if flat_type not in averages[month][town]:
                averages[month][town][flat_type] = {}
            averages[month][town][flat_type]["1990_onwards"] = {
                "count": count,
                "avg_price": average,
                "max_price": max_price,
                "min_price": min_price,
                "avg_psf": avg_psf,
            }

    return averages


# download_csv()
process_csv("output.csv")
