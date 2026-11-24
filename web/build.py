import base64, pathlib
root = pathlib.Path(__file__).parent; src = root/'src'; fdir = root.parent/'fonts'/'onest'/'package'/'files'
fonts = ''
for w in (400,500,600,700,800):
    for sub, rng in (('cyrillic','U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'),('latin','U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD')):
        b = base64.b64encode((fdir/f'onest-{sub}-{w}-normal.woff2').read_bytes()).decode()
        fonts += f"@font-face{{font-family:'Onest';font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{b}) format('woff2');unicode-range:{rng}}}\n"
js = '\n'.join((src/f).read_text() for f in ('data.js','core.js','screens.js','match.js','games.js','app.js'))
html = (src/'template.html').read_text().replace('/*FONTS*/', fonts).replace('/*CSS*/', (src/'styles.css').read_text()).replace('/*JS*/', js)
(root/'index.html').write_text(html)
print('index.html', len(html)//1024, 'KB')
