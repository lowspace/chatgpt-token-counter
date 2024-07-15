from PIL import Image
import sys

def convert_and_resize(image_path, output_width, output_height):
    # Try to open the image file
    try:
        with Image.open(image_path) as img:
            # Resize the image
            img = img.resize((output_width, output_height), Image.ANTIALIAS)

            # Define the output filename, assume the input is 'path/to/image.jpg'
            output_path = image_path.rsplit('.', 1)[0] + '.png'

            # Save the image in PNG format
            img.save(output_path, 'PNG')

            print(f"Image converted and saved as: {output_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python script.py image_path output_width output_height")
    else:
        image_path = sys.argv[1]
        output_width = int(sys.argv[2])
        output_height = int(sys.argv[3])
        convert_and_resize(image_path, output_width, output_height)