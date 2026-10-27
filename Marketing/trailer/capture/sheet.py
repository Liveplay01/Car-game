import sys, glob
from PIL import Image, ImageDraw
files = sorted(glob.glob(sys.argv[2]))
cols = int(sys.argv[3]); w = 270; h = 480
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), 'black')
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h))
    ImageDraw.Draw(im).text((6, 6), __import__('os').path.basename(f)[:-4], fill='yellow')
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(sys.argv[1])
