# shape a string with HarfBuzz at given variation axes and return SVG path data (y down, baseline at 0)
import sys, json, uharfbuzz as hb
class Pen:
    def __init__(s): s.d=[]
    def move_to(s,x,y,c): s.d.append(f"M{x:.2f} {-y:.2f}")
    def line_to(s,x,y,c): s.d.append(f"L{x:.2f} {-y:.2f}")
    def quadratic_to(s,a,b,x,y,c): s.d.append(f"Q{a:.2f} {-b:.2f} {x:.2f} {-y:.2f}")
    def cubic_to(s,a,b,c1,d1,x,y,c): s.d.append(f"C{a:.2f} {-b:.2f} {c1:.2f} {-d1:.2f} {x:.2f} {-y:.2f}")
    def close_path(s,c): s.d.append("Z")
def shape(path, text, axes, size=1000, tracking=0, kern_overrides=None):
    blob = hb.Blob.from_file_path(path); face = hb.Face(blob); font = hb.Font(face)
    upem = face.upem; font.scale = (upem, upem)
    if axes: font.set_variations(axes)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True})
    k = size / upem; x = 0; out = []
    funcs = hb.DrawFuncs()
    for i,(info,pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
        pen = Pen()
        funcs.set_move_to_func(pen.move_to); funcs.set_line_to_func(pen.line_to)
        funcs.set_quadratic_to_func(pen.quadratic_to); funcs.set_cubic_to_func(pen.cubic_to); funcs.set_close_path_func(pen.close_path)
        font.draw_glyph(info.codepoint, funcs, None)
        adj = (kern_overrides or {}).get(i, 0)
        out.append({"ch": text[info.cluster], "x": (x + pos.x_offset) * k, "d": " ".join(pen.d), "adv": pos.x_advance * k, "k": k})
        x += pos.x_advance + tracking + adj
    ext = font.get_font_extents("ltr")
    return {"glyphs": out, "width": x * k - tracking * k, "asc": ext.ascender * k, "desc": ext.descender * k, "upem": upem}
if __name__ == "__main__":
    path, text, axes = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
    print(json.dumps(shape(path, text, axes, tracking=int(sys.argv[4]) if len(sys.argv) > 4 else 0)))
