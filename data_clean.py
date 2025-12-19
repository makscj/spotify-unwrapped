# Glob code which loads in all the JSON files in a directory, deletes any specified columns, and writes them back out to a single cleaned JSON file.
import os
import glob
import json
import pandas as pd
def clean_spotify_data(input_folder, output_file, columns_to_remove):
    all_files = glob.glob(os.path.join(input_folder, "*.json"))
    data_frames = []
    for file in all_files:
        with open(file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            df = pd.DataFrame(data)
            df.drop(columns=columns_to_remove, inplace=True, errors='ignore')
            # Remove rows with missing spotify_track_uri, as they are not useful
            df = df[df['spotify_track_uri'].notna()]
            data_frames.append(df)
    if data_frames:
        combined_df = pd.concat(data_frames, ignore_index=True)
        # Split into multiple JSON files, each <= 65MB
        records = combined_df.to_dict(orient='records')
        max_bytes = 65 * 1024 * 1024  # 65MB
        file_idx = 1
        chunk = []
        chunk_bytes = 0
        def json_size(obj):
            return len(json.dumps(obj, ensure_ascii=False))
        for rec in records:
            rec_bytes = json_size(rec)
            if chunk_bytes + rec_bytes > max_bytes and chunk:
                out_name = f"{os.path.splitext(output_file)[0]}_{file_idx}.json"
                output_path = os.path.join(input_folder, out_name)
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(chunk, f, ensure_ascii=False, indent=4)
                print(f"Written {len(chunk)} records to {output_path}")
                file_idx += 1
                chunk = []
                chunk_bytes = 0
            chunk.append(rec)
            chunk_bytes += rec_bytes
        # Write any remaining records
        if chunk:
            out_name = f"{os.path.splitext(output_file)[0]}_{file_idx}.json"
            output_path = os.path.join(input_folder, out_name)
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(chunk, f, ensure_ascii=False, indent=4)
            print(f"Written {len(chunk)} records to {output_path}")
    else:
        print("No data files found.")

if __name__ == "__main__":
    input_folder = "data"
    output_file = "cleaned_spotify_data.json"
    # remove any PII columns
    columns_to_remove = ["ip_addr", "conn_country", "platform", "device_info", "offline_timestamp"]
    clean_spotify_data(input_folder, output_file, columns_to_remove)