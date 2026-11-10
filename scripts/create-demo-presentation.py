from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import math, shutil, zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'submission'
ASSETS = OUT / 'assets'
ASSETS.mkdir(parents=True, exist_ok=True)
W,H = 1920,1080
NAVY='#1E243B'; PANEL='#272F4D'; PANEL2='#303A5C'; BLUE='#418AF2'; INDIGO='#6D6FFF'; MINT='#19CEB3'; PINK='#D62B70'; WHITE='#F4F6FC'; MUTED='#AFBAD8'; FAINT='#7F8CAF'; LINE='#3B466A'; GREEN='#8FE5CF'; AMBER='#FFC46B'

def rgb(h):
    h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
def font(size,bold=False):
    paths = ['C:/Windows/Fonts/aptos.ttf','C:/Windows/Fonts/arial.ttf','C:/Windows/Fonts/segoeui.ttf']
    boldpaths = ['C:/Windows/Fonts/aptos-bold.ttf','C:/Windows/Fonts/arialbd.ttf','C:/Windows/Fonts/segoeuib.ttf']
    for p in (boldpaths if bold else paths):
        if Path(p).exists(): return ImageFont.truetype(p,size)
    return ImageFont.load_default()

# Animated brand mark: blue orbit streaks with a soft 3D-ish mascot face.
frames=[]
for f in range(48):
    im=Image.new('RGBA',(480,320),(0,0,0,0)); d=ImageDraw.Draw(im)
    cx,cy=240,156
    # orbiting blue trails behind the face
    for j,col in enumerate((BLUE,INDIGO,'#71C9FF')):
        a=2*math.pi*f/48+j*2.08
        pts=[]
        for k in range(31):
            t=k/30*1.8+ a
            x=cx+150*math.cos(t); y=cy+58*math.sin(t)
            pts.append((x,y))
        d.line(pts,fill=(*rgb(col),150),width=7)
        px=cx+150*math.cos(a); py=cy+58*math.sin(a)
        d.ellipse((px-7,py-7,px+7,py+7),fill=(*rgb('#BBD9FF'),255))
    d.ellipse((144,61,336,253),fill=(*rgb('#EAF2FF'),255))
    d.ellipse((156,70,326,238),fill=(*rgb('#FFFFFF'),255))
    d.ellipse((197,135,218,178),fill=(*rgb(NAVY),255)); d.ellipse((262,135,283,178),fill=(*rgb(NAVY),255))
    # tiny blue highlight
    d.ellipse((201,138,207,144),fill=(*rgb(BLUE),255)); d.ellipse((266,138,272,144),fill=(*rgb(BLUE),255))
    frames.append(im)
frames[0].save(ASSETS/'ledgerly-orbit.gif',save_all=True,append_images=frames[1:],duration=65,loop=0,disposal=2)

# Animated shared-input flow.
frames=[]
node_x=[70,365,660,955,1250,1545]; labels=['TASK','SHARED\nINPUT','AGENTS','VALIDATOR','METRICS','TRACE']
for f in range(36):
    im=Image.new('RGBA',(1740,250),(0,0,0,0)); d=ImageDraw.Draw(im)
    for i,x in enumerate(node_x):
        d.rounded_rectangle((x,67,x+170,177),radius=22,fill=(*rgb(PANEL),255),outline=(*rgb(BLUE if i in (0,2,5) else LINE),255),width=3)
        label=labels[i].split('\n')
        for q,t in enumerate(label):
            box=d.textbbox((0,0),t,font=font(23,True)); d.text((x+85-(box[2]-box[0])/2,97+q*28),t,font=font(23,True),fill=(*rgb(WHITE),255))
        if i<len(node_x)-1: d.line((x+180,122,x+280,122),fill=(*rgb(LINE),255),width=4)
    x=72+(f/36)*1550
    d.ellipse((x-13,109,x+13,135),fill=(*rgb(MINT),255))
    d.ellipse((x-22,100,x+22,144),outline=(*rgb(MINT),115),width=3)
    frames.append(im)
frames[0].save(ASSETS/'shared-task-flow.gif',save_all=True,append_images=frames[1:],duration=80,loop=0,disposal=2)

# Animated repeated result bars: equal evidence-case denominator, 3-repeat summary.
frames=[]
for f in range(36):
    im=Image.new('RGBA',(1000,420),(0,0,0,0)); d=ImageDraw.Draw(im)
    ys=[75,190,305]; vals=[0.5,0,0]; colors=[BLUE,'#687393','#687393']; names=['Tool agent','Direct single-pass','LangGraph.js']
    progress=min(1,(f+1)/22)
    for y,v,c,n in zip(ys,vals,colors,names):
        d.text((10,y+5),n,font=font(24,True),fill=(*rgb(WHITE),255))
        left=330; width=520
        d.rounded_rectangle((left,y,left+width,y+38),radius=18,fill=(*rgb(PANEL2),255))
        fill=int(width*v*progress)
        if fill>0: d.rounded_rectangle((left,y,left+fill,y+38),radius=18,fill=(*rgb(c),255))
        d.text((875,y+2),f'{int(v*100*progress)}%',font=font(28,True),fill=(*rgb(c if v else MUTED),255))
    frames.append(im)
frames[0].save(ASSETS/'evidence-results.gif',save_all=True,append_images=frames[1:],duration=90,loop=0,disposal=2)

prs=Presentation(); prs.slide_width=Inches(13.333); prs.slide_height=Inches(7.5)
blank=prs.slide_layouts[6]

def rect(slide,x,y,w,h,color,radius=True,line=None,trans=0):
    sh=slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    sh.fill.solid(); sh.fill.fore_color.rgb=RGBColor(*rgb(color)); sh.fill.transparency=trans
    sh.line.fill.background() if not line else None
    if line: sh.line.color.rgb=RGBColor(*rgb(line)); sh.line.width=Pt(1)
    if radius:
        try: sh.adjustments[0]=0.12
        except: pass
    return sh

def text(slide,txt,x,y,w,h,size=20,color=WHITE,bold=False,fontname='Aptos',align=PP_ALIGN.LEFT, valign=MSO_ANCHOR.TOP,margin=0.02):
    box=slide.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h)); tf=box.text_frame; tf.clear(); tf.word_wrap=True
    tf.margin_left=Inches(margin); tf.margin_right=Inches(margin); tf.margin_top=Inches(margin); tf.margin_bottom=Inches(margin); tf.vertical_anchor=valign
    for n,line in enumerate(txt.split('\n')):
        p=tf.paragraphs[0] if n==0 else tf.add_paragraph(); p.text=line; p.alignment=align; p.space_after=Pt(0); p.space_before=Pt(0)
        for run in p.runs: run.font.name=fontname; run.font.size=Pt(size); run.font.bold=bold; run.font.color.rgb=RGBColor(*rgb(color))
    return box

def base(title,kicker='LEDGERLY  /  AGENT BENCHMARK',number=None):
    s=prs.slides.add_slide(blank); s.background.fill.solid(); s.background.fill.fore_color.rgb=RGBColor(*rgb(NAVY))
    # restrained grid and corner glow
    for x in range(0,14):
        sh=s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(0), Inches(0.006), Inches(7.5)); sh.fill.solid(); sh.fill.fore_color.rgb=RGBColor(*rgb('#25304D')); sh.fill.transparency=35; sh.line.fill.background()
    text(s,kicker,.62,.27,7,.25,9,MUTED,True)
    text(s,title,.62,.62,12.1,.8,30,WHITE,True)
    rect(s,.62,7.12,12.1,.012,LINE,False)
    text(s,'Synthetic tasks  ·  Local model  ·  $0 paid API fees',.62,7.2,9,.18,8,FAINT)
    if number is not None: text(s,f'{number:02d}',12.23,7.18,.42,.2,9,FAINT,True,align=PP_ALIGN.RIGHT)
    return s

def card(s,x,y,w,h,title_,body=None,accent=BLUE,tag=None):
    rect(s,x,y,w,h,PANEL,True,LINE)
    rect(s,x,y,.055,h,accent,False)
    text(s,title_,x+.22,y+.19,w-.42,.38,15,WHITE,True)
    if body: text(s,body,x+.22,y+.68,w-.44,h-.84,12,MUTED)
    if tag: text(s,tag,x+.22,y+h-.4,w-.44,.22,9,accent,True)

def bullet(s,txt,x,y,w,accent=BLUE,size=14):
    rect(s,x,y+.08,.09,.09,accent,True)
    text(s,txt,x+.22,y,w-.22,.52,size,WHITE)

# 1 — title
s=prs.slides.add_slide(blank); s.background.fill.solid(); s.background.fill.fore_color.rgb=RGBColor(*rgb(NAVY))
for x in range(14):
    sh=s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(0), Inches(.006), Inches(7.5)); sh.fill.solid(); sh.fill.fore_color.rgb=RGBColor(*rgb('#293455')); sh.fill.transparency=38; sh.line.fill.background()
text(s,'AI AGENTS & INTELLIGENT SYSTEMS',.82,.52,6,.3,10,MINT,True)
text(s,'Same tasks.\nVisible traces.\nHonest comparison.',.82,1.25,8,3.0,36,WHITE,True)
text(s,'Ledgerly Agent Benchmark',.87,4.62,6,.52,20,BLUE,True)
text(s,'A local, repeatable benchmark for agent behavior—not just model answers.',.87,5.18,6.6,.72,14,MUTED)
s.shapes.add_picture(str(ASSETS/'ledgerly-orbit.gif'), Inches(8.55), Inches(1.35), width=Inches(3.45), height=Inches(2.3))
rect(s,8.8,4.45,3.3,.78,PANEL,True,LINE); text(s,'3 strategies  ·  6 core scenarios  ·  3 repeats',9.02,4.72,2.9,.28,11,WHITE,True,align=PP_ALIGN.CENTER)
text(s,'Prototype evaluation · qwen3:1.7b · Ollama · CPU',.87,6.82,7,.22,9,FAINT)
text(s,'01',12.23,7.18,.42,.2,9,FAINT,True,align=PP_ALIGN.RIGHT)

# 2 — problem
s=base('Agents need a fair test bench.');
text(s,'An agent is more than its final answer. It can use tools, take multiple steps, fail mid-task, or follow misleading instructions.',.65,1.58,11.8,.85,19,MUTED)
card(s,.68,2.72,3.82,2.05,'Same work','Give each candidate identical task facts, scoped evidence, rules, citations, and output schema.',BLUE)
card(s,4.75,2.72,3.82,2.05,'Same scorecard','Measure success and execution behavior across repeated runs.',MINT)
card(s,8.82,2.72,3.82,2.05,'Failures included','Probe tool errors, model outages, and misleading source instructions.',PINK)
text(s,'The benchmark is the product. Agent quality is what it measures.',.72,5.5,11.7,.5,22,WHITE,True,align=PP_ALIGN.CENTER)

# 3 — workflow
s=base('One shared contract, three agent strategies.',number=3)
text(s,'Candidates receive the same case payload and generation settings. Common validation checks evidence scope and citation integrity; expected outcomes stay hidden until scoring.',.68,1.52,12,.77,14,MUTED)
s.shapes.add_picture(str(ASSETS/'shared-task-flow.gif'), Inches(.72), Inches(2.65), width=Inches(11.9), height=Inches(1.72))
labels=[('01','Ledgerly tool agent','Bounded tool loop'),('02','Direct single-pass','One model response'),('03','LangGraph.js','Independent graph adapter')]
for i,(n,t,b) in enumerate(labels):
    x=.78+i*4.07; rect(s,x,4.95,3.74,1.15,PANEL,True,LINE)
    text(s,n,x+.18,5.14,.5,.3,12,MINT,True); text(s,t,x+.75,5.08,2.8,.3,13,WHITE,True); text(s,b,x+.75,5.48,2.8,.28,10,MUTED)

# 4 — task suite
s=base('Stress the behavior that matters.',number=4)
items=[('AUTHORIZED EVIDENCE','Can it support a decision from the right records?',BLUE),('MISSING ACCEPTANCE','Does it recognize an evidence gap?',MINT),('UNAUTHORIZED APPROVER','Does it reject acceptance from the wrong person?',PINK),('MISLEADING INSTRUCTION','Does it ignore instruction-like source content?',INDIGO),('FAILING TOOL','Can it recover from an injected tool-call failure?',AMBER),('MODEL UNAVAILABLE','Does it report an outage without silent fallback?',GREEN)]
for i,(head,body,col) in enumerate(items):
    x=.72+(i%2)*6.15; y=1.62+(i//2)*1.56
    card(s,x,y,5.75,1.25,head,body,col)
text(s,'Synthetic invoice-evidence tasks only. No customer data or payment action.',.78,6.52,10,.22,10,FAINT)

# 5 — comparison result
s=base('On shared evidence tasks: 50% vs 0%.',number=5)
text(s,'Correct outcomes across the four common evidence scenarios, repeated three times per strategy.',.72,1.5,11.8,.42,14,MUTED)
s.shapes.add_picture(str(ASSETS/'evidence-results.gif'), Inches(.95), Inches(2.05), width=Inches(7.3), height=Inches(3.05))
rect(s,8.65,2.0,3.75,3.38,PANEL,True,LINE)
text(s,'6 / 12',8.95,2.37,3.12,.68,34,BLUE,True,align=PP_ALIGN.CENTER)
text(s,'tool-agent passes',8.95,3.1,3.12,.34,14,WHITE,True,align=PP_ALIGN.CENTER)
text(s,'0 / 12',8.95,3.75,3.12,.68,34,MUTED,True,align=PP_ALIGN.CENTER)
text(s,'for each single-pass adapter',8.95,4.48,3.12,.36,12,MUTED,align=PP_ALIGN.CENTER)
text(s,'Same 4 evidence tasks × 3 repeats per adapter. Synthetic results; not a general reliability estimate.',.76,6.25,11.6,.36,11,AMBER,True)

# 6 — reliability controls
s=base('The benchmark makes failure visible.',number=6)
card(s,.72,1.72,3.83,2.0,'Tool-failure recovery','Tool agent recovered from the injected one-time failure in 3 of 3 repeats.',MINT,tag='SINGLE-PASS: NOT SUPPORTED')
card(s,4.75,1.72,3.83,2.0,'Unavailable model','All three strategies returned the expected explicit outage outcome in 3 of 3 repeats.',BLUE,tag='NO SILENT FALLBACK')
card(s,8.78,1.72,3.83,2.0,'Misleading / authority cases','Tool agent: 0/3 on unauthorized-approver and misleading-instruction tasks.',PINK,tag='QUALITY GAP EXPOSED')
text(s,'A clean execution is not the same as a correct decision.',.85,4.42,11.6,.55,22,WHITE,True,align=PP_ALIGN.CENTER)
text(s,'The model returned valid runs, but missed two critical evidence scenarios consistently. The app keeps production policy enforcement in code.',1.22,5.18,10.8,.7,14,MUTED,align=PP_ALIGN.CENTER)

# 7 — metrics
s=base('Measure the whole execution—not only success.',number=7)
metrics=[('TASK OUTCOME','Pass · incorrect · error · unsupported'),('EXECUTION','Steps · tool calls · model requests'),('TOKEN USE','Prompt and generated tokens'),('TIME','End-to-end and Ollama request timing'),('COST','Estimated API fees: $0.00'),('TRACE','Per-attempt events and saved repeats')]
for i,(h,b) in enumerate(metrics):
    x=.72+(i%3)*4.08; y=1.72+(i//3)*1.63
    card(s,x,y,3.76,1.3,h,b,[BLUE,MINT,INDIGO,AMBER,GREEN,PINK][i])
text(s,'Local inference avoids paid API fees. Existing hardware, electricity, and network are excluded.',.78,5.55,11.6,.46,12,MUTED,align=PP_ALIGN.CENTER)

# 8 — UI evidence
s=base('A comparison interface built for inspection.',number=8)
text(s,'Saved runs show repeated outcomes, execution metrics, task-level breakdowns, and expandable traces.',.72,1.45,12,.45,13,MUTED)
# frame screenshot inside slide
rect(s,.76,2.05,11.8,4.15,'#13192D',True,LINE)
s.shapes.add_picture(str(ASSETS/'benchmark-workspace.png'), Inches(.88), Inches(2.17), width=Inches(11.56), height=Inches(3.99))
text(s,'The displayed adapter-wide percentages have different denominators. Use the equal-denominator common evidence comparison on the previous result slide.',.82,6.42,11.6,.4,10,AMBER,True)

# 9 — repeatability/latency
s=base('Three repeats show stable outcomes, limited scope.',number=9)
# repeat motif
for i in range(3):
    x=1.0+i*1.5; rect(s,x,1.85,1.05,1.05,PANEL,True,BLUE); text(s,str(i+1),x,2.12,1.05,.35,20,WHITE,True,align=PP_ALIGN.CENTER,valign=MSO_ANCHOR.MIDDLE)
    if i<2: rect(s,x+1.08,2.35,.42,.035,BLUE,False)
text(s,'Repeat outcomes were identical for each adapter across this core suite.',5.95,2.05,6,.64,17,WHITE,True)
card(s,.75,3.55,3.85,1.55,'Tool agent','46.9 s mean attempt\n2 steps · 2 tool calls',BLUE)
card(s,4.76,3.55,3.85,1.55,'Direct single-pass','28.9 s mean attempt\n1 step · 0 tool calls',MINT)
card(s,8.77,3.55,3.85,1.55,'LangGraph.js','24.2 s mean attempt\n1 step · 0 tool calls',INDIGO)
text(s,'Suite averages use different supported-task denominators and include outage controls; they are not a speed ranking. Local CPU wall-clock includes host-standby caveats.',.86,5.78,11.7,.48,11,AMBER,True)

# 10 — truth and boundaries
s=base('What Ledgerly proves—and what it does not.',number=10)
card(s,.75,1.7,5.75,3.7,'What it demonstrates','Fair shared input/output contract\nRepeated multi-strategy evaluation\nTool-fault and outage scenarios\nVisible task outcomes and execution traces\nOne independent LangGraph.js adapter',MINT)
card(s,6.78,1.7,5.75,3.7,'What remains unproven','High agent accuracy (90% target not met)\nBroad framework interoperability\nReal-customer or production reliability\nGeneral financial reasoning\nMarket demand or cash recovered',PINK)
text(s,'The strongest result is an honest benchmark that exposes the gaps.',.82,5.92,11.6,.48,21,WHITE,True,align=PP_ALIGN.CENTER)

# 11 — next steps / close
s=base('The next win is better evidence reasoning.',number=11)
bullet(s,'Improve contract interpretation and authorized-acceptance reasoning.',.95,1.7,10.8,BLUE,16)
bullet(s,'Add another independent framework adapter under the same contract.',.95,2.55,10.8,MINT,16)
bullet(s,'Expand tasks and repeat counts before making reliability claims.',.95,3.4,10.8,INDIGO,16)
bullet(s,'Keep human review and application-side safety checks in control.',.95,4.25,10.8,PINK,16)
rect(s,.82,5.42,11.65,.9,PANEL,True,LINE)
text(s,'Same task.  Fair test.  Visible evidence.',1.05,5.67,11.2,.38,21,WHITE,True,align=PP_ALIGN.CENTER)
text(s,'LEDGERLY AGENT BENCHMARK  ·  LOCAL  ·  SYNTHETIC  ·  $0 PAID API FEES',.92,6.62,11.3,.22,9,MINT,True,align=PP_ALIGN.CENTER)

prs.core_properties.title='Ledgerly Agent Benchmark — Demo Presentation'
prs.core_properties.subject='AI agent benchmarking platform demonstration and honest three-repeat evaluation'
prs.core_properties.author='Ledgerly'
prs.core_properties.keywords='AI agents, benchmark, synthetic, qwen3.1.7b, Ollama'
path=OUT/'ledgerly-agent-benchmark-demo.pptx'; prs.save(path)

# Short handoff / narration notes.
script='''# Ledgerly demo talk track (about 3 minutes)\n\n## Slide 1 — 0:00–0:12\nLedgerly is a local agent benchmarking platform. It compares how agents behave on identical work, not just the quality of a model’s final answer.\n\n## Slide 2 — 0:12–0:28\nAgents may reason in steps, call tools, encounter failures, or be influenced by misleading content. A useful benchmark needs shared inputs, repeat runs, and traces people can inspect.\n\n## Slide 3 — 0:28–0:45\nWe built three strategies around the same local model: our bounded tool agent, a direct single-pass baseline, and a LangGraph.js adapter. Every candidate gets the same facts, evidence, rules, citation options, and output contract.\n\n## Slide 4 — 0:45–1:00\nThe core suite includes authorized and missing evidence, unauthorized acceptance, a misleading instruction, an injected tool failure, and an unavailable model. All cases are synthetic.\n\n## Slide 5 — 1:00–1:25\nThe fair common-task comparison is four evidence cases over three repeats each. The tool agent passed six of twelve attempts, or fifty percent. Both single-pass candidates passed zero of twelve. That is a narrow result on this task set, not a general reliability claim.\n\n## Slide 6 — 1:25–1:45\nThe tool agent recovered from the injected tool failure three out of three times. Every candidate correctly surfaced the unavailable model three out of three times. The tool agent failed the unauthorized-approver and misleading-instruction cases every time. The benchmark makes these limits visible.\n\n## Slide 7 — 1:45–2:00\nFor each attempt, Ledgerly records outcomes, steps, calls, tokens, timing, estimated API fees, and trace events. Inference was local through Ollama, with no paid API fees.\n\n## Slide 8 — 2:00–2:15\nHere is the comparison workspace. The cards expose full-run totals, while the equal-denominator evidence comparison is reported separately because adapters have different supported-task counts.\n\n## Slide 9 — 2:15–2:30\nThe three repeats produced identical task outcomes. Timing is from one local CPU setup; the host had standby events, and the adapters have different supported-task denominators. These numbers are descriptive, not a speed ranking or guarantee.\n\n## Slide 10 — 2:30–2:45\nLedgerly demonstrates a repeatable, inspectable benchmark with failure scenarios. It does not prove high agent accuracy, production readiness, or broad framework compatibility. Only one independent LangGraph adapter is implemented.\n\n## Slide 11 — 2:45–3:00\nOur next steps are to improve evidence reasoning, add another independent adapter, and expand evaluation before making stronger claims. The value today is a fair test bench that shows exactly where agents still fail.\n\n## Run details\nCorrected run: e3dd1e49-5d40-4cd2-b03c-9dfce4654804. Contract v3. qwen3:1.7b, Ollama 0.12.6, CPU, temperature 0, 4096 context, 1000 output-token cap. Three repeats; 54 total adapter attempts. Two Modern Standby intervals occurred during the run; wall-clock timing carries that limitation. Synthetic tasks only.\n\n## Presentation note\nThe orbit, pipeline, and result bars are animated GIFs embedded in the PowerPoint. They animate in slide-show mode; a static preview may show only their first frame.\n'''
(OUT/'talk-track.md').write_text(script,encoding='utf-8')
(OUT/'README.txt').write_text('''Ledgerly Agent Benchmark — demo package\n\nOpen ledgerly-agent-benchmark-demo.pptx in PowerPoint or another compatible presentation app. Animated graphics play in slide-show mode. Use talk-track.md for the three-minute narration and benchmark caveats.\n\nEvaluation: corrected three-repeat synthetic core suite, run e3dd1e49-5d40-4cd2-b03c-9dfce4654804. Local qwen3:1.7b through Ollama. No paid inference API or hosting. See ../docs/evaluation-results.md for full results and limitations.\n''',encoding='utf-8')

# Structural checks on the generated artifact.
check=Presentation(path)
assert len(check.slides)==11, len(check.slides)
with zipfile.ZipFile(path) as z:
    gifs=[n for n in z.namelist() if n.startswith('ppt/media/') and n.lower().endswith('.gif')]
    assert len(gifs)>=3, gifs
print(f'Created {path} ({path.stat().st_size:,} bytes), {len(check.slides)} slides, {len(gifs)} embedded animated GIFs')
