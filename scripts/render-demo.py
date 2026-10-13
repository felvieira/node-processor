"""Render a silent product presentation from the repository's real app capture."""
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SCENES = [
    ("01 / ENCONTRE", ["Qual projeto", "está rodando?"], ["Node, Python, Docker", "e agentes de IA.", "Uma lista com contexto."], 1.0, 0.5, 0.5),
    ("02 / ENTENDA", ["Cada processo.", "Sua pasta."], ["Comando, porta, CPU", "e memória, organizados", "por projeto."], 1.22, 0.1, 0.24),
    ("03 / REVISE", ["Duplicados", "à vista."], ["Encontre comandos", "repetidos e revise", "antes de encerrar."], 1.2, 0.9, 0.1),
    ("04 / COMECE", ["Sua máquina.", "Seu controle."], ["node-processor", "Gratuito para Windows.", "Baixe o instalador."], 1.0, 0.5, 0.5),
]

def run(args, cwd):
    subprocess.run(args, cwd=cwd, check=True)

def main():
    with tempfile.TemporaryDirectory(prefix="node-processor-video-") as directory:
        work = Path(directory)
        shutil.copyfile(ROOT / 'landing/assets/screenshot-hero.png', work / 'screen.png')
        shutil.copyfile('C:/Windows/Fonts/segoeui.ttf', work / 'body.ttf')
        shutil.copyfile('C:/Windows/Fonts/seguisb.ttf', work / 'bold.ttf')
        for index, (label, title, description, zoom, x, y) in enumerate(SCENES):
            labels = [(label, 60, 205, 16, 'b9d99c', 'body')]
            labels += [(line, 60, 263 + j * 57, 43, 'f5f4ee', 'bold') for j, line in enumerate(title)]
            labels += [(line, 60, 414 + j * 30, 20, 'bcc9bf', 'body') for j, line in enumerate(description)]
            labels += [('node-processor', 60, 68, 24, 'd8edb9', 'bold'), ('APRESENTAÇÃO DA INTERFACE / CAPTURA DE EXEMPLO / SEM ÁUDIO', 60, 849, 13, 'bcc9bf', 'body')]
            filters = [f"[1:v]scale=2840:-1,zoompan=z='{zoom}+0.00012*on':x='(iw-iw/zoom)*{x}':y='(ih-ih/zoom)*{y}':d=150:s=1020x626:fps=30[screen]", '[0:v][screen]overlay=520:137:shortest=1[base]']
            texts = []
            for n, (value, tx, ty, size, color, font) in enumerate(labels):
                name = f'text-{index}-{n}.txt'
                (work / name).write_text(value, encoding='utf-8')
                texts.append(f"drawtext=fontfile={font}.ttf:textfile={name}:fontsize={size}:fontcolor=0x{color}:x={tx}:y={ty}")
            texts += [f"drawbox=x=60:y=792:w={345 * (index + 1) / 4}:h=3:color=0xb9d99c:t=fill", 'fade=t=in:st=0:d=0.25', 'fade=t=out:st=4.75:d=0.25']
            filters.append('[base]' + ','.join(texts) + '[out]')
            run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x202d27:s=1600x900:r=30:d=5', '-i', 'screen.png', '-filter_complex', ';'.join(filters), '-map', '[out]', '-t', '5', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', f'scene-{index}.mp4'], work)
        (work / 'concat.txt').write_text(''.join(f"file 'scene-{i}.mp4'\n" for i in range(4)), encoding='utf-8')
        output = ROOT / 'landing/assets/node-processor-demo.mp4'
        run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', '-movflags', '+faststart', str(output)], work)
        print(f'Rendered {output} ({output.stat().st_size} bytes, 20 seconds, silent)')

if __name__ == '__main__':
    main()
