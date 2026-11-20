# 엔젤스데이 계약서 원본 엑셀 → 빈 양식(public/contracts/*.xlsx)
#
#   python3 -I scripts/contracts/make_templates.py --dol 돌.xlsx --birthday 생신.xlsx --wedding 웨딩.xlsx --banquet 연회.xlsx
#
# 원본은 실제 고객 계약서라 저장소에 넣지 않습니다. 이 스크립트는 서식·로고·인쇄 설정은 그대로 두고
#  - 고객·담당자 이름, 연락처, 날짜, 계약금, 메모 칸의 값을 지우고 (서식은 유지)
#  - 인쇄 영역 밖에 남은 메모 칸을 지우고
#  - 더 이상 쓰지 않는 공유 문자열(지운 이름 등)까지 파일에서 빼고
#  - 시트 이름과 문서 속성(작성자)을 일반 이름으로 바꿉니다.
# 엑셀 XML 은 lxml 로 고쳐 접두사·네임스페이스를 그대로 둡니다 (ElementTree 는 Excel 이 거부하는 파일을 만듭니다).
import argparse, re, zipfile
from pathlib import Path
from lxml import etree

NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
N = {'m': NS}
RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

DATE_BLANK = '        년       월       일        요일        시       분  ~        시       분'

# 양식별: 새 시트 이름, 지울 칸, 기본 문구로 바꿀 칸
SPEC = {
    'dol': {
        'front': '돌계약서',
        'clear_front': [],
        'clear_rules': ['C6', 'D19', 'H19'],
        'set_front': {},
    },
    'birthday': {
        'front': '생신계약서',
        'clear_front': ['M3', 'C4', 'M4', 'C5', 'H5', 'D7', 'G7', 'C34'],
        'clear_rules': ['C6', 'C20', 'G20', 'A17', 'A20'],
        'set_front': {'C3': DATE_BLANK, 'C33': '                                              년           월           일'},
    },
    'wedding': {
        'front': '웨딩계약서',
        'clear_front': ['D10', 'H10', 'C32'],
        'clear_rules': ['A1', 'A11', 'C19', 'G19'],
        'set_front': {},
    },
    'banquet': {
        'front': '연회계약서',
        'clear_front': ['O4', 'C5', 'O5', 'C7', 'H7', 'C37', 'F37', 'I37', 'C38'],
        'clear_rules': ['C6', 'C19', 'C20', 'G20'],
        'set_front': {'C4': DATE_BLANK},
    },
}


def col_num(letters):
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n


def split_ref(ref):
    m = re.match(r'([A-Z]+)(\d+)$', ref)
    return col_num(m.group(1)), int(m.group(2))


def print_area(wb_xml, sheet_index):
    """sheet_index(0부터)의 인쇄 영역 (c1, r1, c2, r2)"""
    for dn in wb_xml.iterfind('.//m:definedName', N):
        if dn.get('name') == '_xlnm.Print_Area' and dn.get('localSheetId') == str(sheet_index):
            rng = dn.text.split('!')[-1].replace('$', '')
            a, b = rng.split(':')
            c1, r1 = split_ref(a)
            c2, r2 = split_ref(b)
            return c1, r1, c2, r2
    return None


def clear_cell(c):
    for child in list(c):
        c.remove(child)
    c.attrib.pop('t', None)


def set_inline(c, text):
    clear_cell(c)
    c.set('t', 'inlineStr')
    is_ = etree.SubElement(c, f'{{{NS}}}is')
    t = etree.SubElement(is_, f'{{{NS}}}t')
    t.text = text
    t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')


def build(kind, src, out):
    spec = SPEC[kind]
    zin = zipfile.ZipFile(src)
    files = {n: zin.read(n) for n in zin.namelist()}
    order = zin.namelist()
    wb = etree.fromstring(files['xl/workbook.xml'])
    sheets = wb.findall('.//m:sheet', N)
    old_front = sheets[0].get('name')

    # 시트 XML 경로 (rels)
    rels = etree.fromstring(files['xl/_rels/workbook.xml.rels'])
    target = {r.get('Id'): r.get('Target') for r in rels}
    paths = ['xl/' + target[s.get(f'{{{RNS}}}id')].lstrip('/').replace('xl/', '') for s in sheets]

    cleared = 0
    for i, path in enumerate(paths):
        ws = etree.fromstring(files[path])
        area = print_area(wb, i)
        clear = set(spec['clear_front'] if i == 0 else spec['clear_rules'])
        sets = spec['set_front'] if i == 0 else {}
        for c in ws.iterfind('.//m:sheetData/m:row/m:c', N):
            ref = c.get('r')
            col, row = split_ref(ref)
            outside = area and not (area[0] <= col <= area[2] and area[1] <= row <= area[3])
            if ref in sets:
                set_inline(c, sets[ref])
            elif (outside or ref in clear) and len(c):
                clear_cell(c)
                cleared += 1
        files[path] = etree.tostring(ws, xml_declaration=True, encoding='UTF-8', standalone=True)

    # 쓰지 않는 공유 문자열 빼고 번호 다시 매기기
    sst = etree.fromstring(files['xl/sharedStrings.xml'])
    items = sst.findall('m:si', N)
    used = set()
    trees = {p: etree.fromstring(files[p]) for p in paths}
    for ws in trees.values():
        for c in ws.iterfind('.//m:c[@t="s"]', N):
            used.add(int(c.find('m:v', N).text))
    remap = {}
    for old in sorted(used):
        remap[old] = len(remap)
    for idx, si in enumerate(items):
        if idx not in used:
            sst.remove(si)
    total = 0
    for p, ws in trees.items():
        for c in ws.iterfind('.//m:c[@t="s"]', N):
            v = c.find('m:v', N)
            v.text = str(remap[int(v.text)])
            total += 1
        files[p] = etree.tostring(ws, xml_declaration=True, encoding='UTF-8', standalone=True)
    sst.set('count', str(total))
    sst.set('uniqueCount', str(len(remap)))
    files['xl/sharedStrings.xml'] = etree.tostring(sst, xml_declaration=True, encoding='UTF-8', standalone=True)

    # 시트 이름 (고객·단체 이름이 들어 있던 이름을 일반 이름으로)
    new_front = spec['front']
    sheets[0].set('name', new_front)
    for dn in wb.iterfind('.//m:definedName', N):
        dn.text = dn.text.replace(f"'{old_front}'", f"'{new_front}'").replace(f'{old_front}!', f"'{new_front}'!")
    # 작성자 PC 의 파일 경로 기록(x15ac:absPath) 제거
    for ac in wb.findall('{http://schemas.openxmlformats.org/markup-compatibility/2006}AlternateContent'):
        if b'absPath' in etree.tostring(ac):
            wb.remove(ac)
    # 열 때 수식 다시 계산
    calc = wb.find('m:calcPr', N)
    if calc is not None:
        calc.set('fullCalcOnLoad', '1')
    files['xl/workbook.xml'] = etree.tostring(wb, xml_declaration=True, encoding='UTF-8', standalone=True)
    app = files['docProps/app.xml'].decode('utf-8').replace(old_front, new_front)
    files['docProps/app.xml'] = app.encode('utf-8')
    core = files['docProps/core.xml'].decode('utf-8')
    core = re.sub(r'<dc:creator>.*?</dc:creator>', '<dc:creator>엔젤스데이</dc:creator>', core)
    core = re.sub(r'<cp:lastModifiedBy>.*?</cp:lastModifiedBy>', '<cp:lastModifiedBy>엔젤스데이</cp:lastModifiedBy>', core)
    core = re.sub(r'<cp:lastPrinted>.*?</cp:lastPrinted>', '', core)
    files['docProps/core.xml'] = core.encode('utf-8')

    # 계산 순서 파일은 지운 수식 칸을 가리킬 수 있어 뺍니다 (Excel 이 다시 만듭니다)
    if 'xl/calcChain.xml' in files:
        del files['xl/calcChain.xml']
        order.remove('xl/calcChain.xml')
        files['xl/_rels/workbook.xml.rels'] = re.sub(rb'<Relationship [^>]*calcChain[^>]*/>', b'', files['xl/_rels/workbook.xml.rels'])
        files['[Content_Types].xml'] = re.sub(rb'<Override [^>]*calcChain[^>]*/>', b'', files['[Content_Types].xml'])

    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for n in order:
            z.writestr(n, files[n])
    print(f'{kind:9s} → {out}  (지운 칸 {cleared}, 공유 문자열 {len(items)} → {len(remap)})')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    for k in SPEC:
        ap.add_argument(f'--{k}', required=True)
    ap.add_argument('--out', default=str(Path(__file__).resolve().parents[2] / 'public' / 'contracts'))
    a = ap.parse_args()
    for k in SPEC:
        build(k, getattr(a, k), Path(a.out) / f'{k}.xlsx')
