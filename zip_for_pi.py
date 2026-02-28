import os
import zipfile

def create_pi_bundle():
    src_dir = r"c:\Users\harsh\Desktop\os"
    dest_zip = r"c:\Users\harsh\Desktop\monk_os_for_pi.zip"
    
    # Directories we want to skip entirely to save space and avoid cross-platform issues
    exclude_dirs = {
        'node_modules', 
        'venv', 
        '__pycache__', 
        '.git', 
        '.vscode',
        'monk_mobile_app',
        'build',         # from react or flutter
        'artifacts',
        '.gemini'        # AI agent data
    }
    
    # Files we want to skip
    exclude_files = {
        'package-lock.json', # Let Pi generate its own if needed, or keep it? We'll keep it.
        'monk_os_for_pi.zip' 
    }

    print(f"Starting compression...")
    print(f"Source: {src_dir}")
    print(f"Destination: {dest_zip}")
    print(f"Excluding: {', '.join(exclude_dirs)}\n")

    file_count = 0
    with zipfile.ZipFile(dest_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(src_dir):
            # Modify dirs in-place to prevent os.walk from entering excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file in exclude_files or file.endswith('.pyc'):
                    continue
                    
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, src_dir)
                
                # Double check to prevent adding the mobile app if it snuck through
                if rel_path.startswith('monk_mobile_app'):
                    continue
                    
                zipf.write(file_path, arcname=rel_path)
                file_count += 1

    print(f"\n✅ Success! Created '{dest_zip}'")
    print(f"Total files compressed: {file_count}")
    print("You can now safely transfer this zip file to your Raspberry Pi 4.")

if __name__ == '__main__':
    create_pi_bundle()
