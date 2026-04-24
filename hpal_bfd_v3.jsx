import { useState, useCallback, useRef } from "react";

/* ── fonts ── */
(() => {
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow:wght@300;400;500;600;700&display=swap";
  document.head.appendChild(l);
})();

/* ── tokens ── */
const T = {
  bg:     "#07080d",
  s1:     "#0c0f18",
  s2:     "#111520",
  s3:     "#161c2c",
  s4:     "#1c2336",
  line:   "#232f47",
  line2:  "#2a3855",
  t1:     "#dce8ff",
  t2:     "#7898c8",
  t3:     "#3d5478",
  mono:   "'Share Tech Mono', monospace",
  sans:   "'Barlow', sans-serif",
  // stream colors
  ore:    "#f59e0b",
  acid:   "#ef4444",
  steam:  "#a78bfa",
  water:  "#38bdf8",
  lime:   "#86efac",
  naoh:   "#6ee7b7",
  reag:   "#94a3b8",
  mhp:    "#22d3a0",
  tsf:    "#d97706",
  sea:    "#0ea5e9",
  vent:   "#64748b",
  eff:    "#f472b6",
};

/* ═══════════════════════════════════════════════════════
   PROCESS UNIT DEFINITIONS — strictly from BFD
═══════════════════════════════════════════════════════ */
const BFD_UNITS = [
  {
    id: "u201", code: "201", name: "Slurry Thickening",
    col: T.water,
    desc: "Combines Mine Ore Slurry + Port Ore Slurry + Water. Thickens to target underflow density for HPAL feed. Overflow water recycled.",
    in_streams:  ["Mine Ore Slurry", "Port Ore Slurry", "Water (process)"],
    out_streams: ["Thickened slurry underflow → 202 HPAL", "Overflow water (recycle)"],
  },
  {
    id: "u202", code: "202", name: "HPAL",
    col: T.acid,
    desc: "High-Pressure Acid Leaching at 250–260 °C, 40–50 bar. Ni and Co dissolve into PLS. Iron precipitates as hematite. Exothermic reactions.",
    in_streams:  ["Thickened slurry ← 201", "Sulfuric Acid ← Acid Plant", "Steam ← Acid Plant"],
    out_streams: ["Autoclave discharge slurry → 203", "Vent gas (O₂, CO₂, SO₂, H₂O) → scrubber"],
    highlight: true,
  },
  {
    id: "u203", code: "203", name: "Recycle Leach & Slurry Neutralisation",
    col: T.lime,
    desc: "Partially neutralises autoclave discharge. Reducing Agent reduces Fe³⁺→Fe²⁺ preventing jarosite. Limestone Slurry raises pH. Water added for density control.",
    in_streams:  ["Autoclave discharge ← 202", "Reducing Agent", "Limestone Slurry", "Water"],
    out_streams: ["Neutralised slurry → 204 CCD"],
  },
  {
    id: "u204", code: "204", name: "CCD",
    col: T.water,
    desc: "Counter-Current Decantation. Multi-stage wash separates Pregnant Leach Solution (PLS) from solid residue. Flocculant added per stage.",
    in_streams:  ["Neutralised slurry ← 203", "Wash water (raffinate recycle)", "Flocculant"],
    out_streams: ["PLS → MHP Precipitation", "Washed residue → 211 Tailings Neutralisation"],
  },
  {
    id: "uMHP", code: "MHP-1", name: "Ni & Co Precipitation 1 & Filtration & Packing",
    col: T.mhp,
    desc: "PLS treated with NaOH (unit 218) to precipitate Ni(OH)₂ and Co(OH)₂ as MHP. Filtered, washed, packed. Raffinate proceeds to Fe & Al removal.",
    in_streams:  ["PLS ← 204 CCD", "NaOH ← 218"],
    out_streams: ["MHP Product (packed)", "Raffinate → 205/206 Fe & Al Removal"],
  },
  {
    id: "u205", code: "205/206", name: "Fe & Al Removal",
    col: T.ore,
    desc: "Air (unit 902) oxidises residual Fe²⁺→Fe³⁺. pH adjustment precipitates Fe(OH)₃ and Al(OH)₃. Clarified solution to Mn Removal.",
    in_streams:  ["Raffinate ← MHP-1", "Air ← 902"],
    out_streams: ["Fe/Al-depleted solution → 211 Mn Removal", "Fe/Al hydroxide sludge → TSF"],
  },
  {
    id: "u211mn", code: "211", name: "Mn Removal",
    col: T.eff,
    desc: "Oxidative precipitation of residual Mn. Treated effluent sent to 606 Effluent Treatment for final polishing before sea discharge.",
    in_streams:  ["Solution ← 205/206"],
    out_streams: ["Treated solution → 606 Effluent Treatment", "Mn sludge → TSF"],
  },
  {
    id: "u606", code: "606", name: "Effluent Treatment",
    col: T.sea,
    desc: "Final pH polish, metal removal to regulatory limits. Treated effluent discharged to sea meeting marine discharge standards.",
    in_streams:  ["Treated solution ← 211 Mn Removal"],
    out_streams: ["Discharge to Sea", "Sludge → TSF"],
  },
  {
    id: "u211t", code: "211-T", name: "Tailings Residue Neutralisation",
    col: T.tsf,
    desc: "Washed CCD underflow neutralised with Lime Milk (unit 510) to pH 8–9. Ensures geochemically stable tailings for TSF disposal.",
    in_streams:  ["Washed residue ← 204 CCD", "Lime Milk ← 510"],
    out_streams: ["Neutralised residue → 215 Residue Filtration"],
  },
  {
    id: "u215", code: "215", name: "Residue Filtration",
    col: T.tsf,
    desc: "Pressure filtration dewaters neutralised residue. Filtrate recycled to circuit. Dry filter cake conveyed to TSF.",
    in_streams:  ["Neutralised residue ← 211-T"],
    out_streams: ["Filter cake → TSF", "Filtrate (recycled to circuit)"],
  },
  {
    id: "uTSF", code: "TSF", name: "Tailings Storage Facility",
    col: T.tsf,
    desc: "Final repository for hematite filter cake, Fe/Al/Mn sludge, and treatment residues. >50% Fe₂O₃. Low ARD risk. Return water recycled.",
    in_streams:  ["Filter cake ← 215", "Fe/Al sludge ← 205/206", "Mn sludge ← 211", "Effluent sludge ← 606"],
    out_streams: ["Stable hematite tailings (stored)", "Return water → plant (recycled)"],
  },
];

/* ═══════════════════════════════════════════════════════
   DEFAULT INPUT PARAMETERS
═══════════════════════════════════════════════════════ */
const DEF = {
  // ── 201: Ore Feed ──────────────────────────────────
  mine_ore_slurry:     300,   // t/h wet, from mine
  port_ore_slurry:     200,   // t/h wet, from port (outsourced)
  ore_moisture:        38,    // wt% moisture in wet ore
  ore_ni:              1.3,   // wt% Ni in dry ore
  ore_co:              0.10,  // wt% Co in dry ore
  process_water_201:   50,    // t/h water added in slurrying
  thickener_uf_solids: 42,    // wt% solids in thickener underflow

  // ── Acid Plant → 202 ──────────────────────────────
  sulphur_hpal:        38,    // t/h S for HPAL acid
  sulphur_byproduct:   7,     // t/h S for by-production
  acid_conc:           93,    // wt% H₂SO₄
  so2_conv:            99.5,  // % SO₂→SO₃ conversion
  steam_to_hpal:       48,    // t/h HPS steam from acid plant

  // ── 203: Neutralisation ────────────────────────────
  limestone_slurry:    9.0,   // t/h limestone slurry (CaCO₃)
  reducing_agent:      0.06,  // t/h
  water_203:           15,    // t/h dilution water

  // ── 204: CCD ──────────────────────────────────────
  wash_water_204:      120,   // t/h wash water (raffinate recycle)
  flocculant:          0.06,  // t/h total (PAC + PAM)

  // ── MHP-1 (218 NaOH) ──────────────────────────────
  ni_recovery:         92,    // %
  co_recovery:         88,    // %
  naoh_218:            3.8,   // t/h NaOH 50% solution
  mhp_battery_pct:     70,    // % MHP to battery grade

  // ── 205/206 Fe & Al Removal ────────────────────────
  air_902:             2.5,   // t/h air blown in

  // ── 211-T: Tailings Neutralisation (510 Lime Milk) ─
  lime_milk_510:       4.2,   // t/h lime milk

  // ── Autoclave geometry ─────────────────────────────
  autoclave_temp:      255,   // °C
  retention_time:      1.0,   // h
  num_compartments:    4,
  slurry_density:      1.25,  // t/m³
};

/* ═══════════════════════════════════════════════════════
   CALCULATION ENGINE — unit by unit per BFD
═══════════════════════════════════════════════════════ */
function runCalc(d) {
  const ANN = 8760 * 0.91; // h/yr @ 91% uptime

  /* ── U201: Slurry Thickening ──────────────────────── */
  const ore_wet_total  = d.mine_ore_slurry + d.port_ore_slurry;
  const ore_moisture_t = ore_wet_total * (d.ore_moisture / 100);
  const ore_dry        = ore_wet_total - ore_moisture_t;
  const slurry_in_201  = ore_wet_total + d.process_water_201;
  const uf_sol_frac    = d.thickener_uf_solids / 100;
  const thickened_uf   = ore_dry / uf_sol_frac;          // total thickened slurry
  const overflow_201   = slurry_in_201 - thickened_uf;   // overflow water recycled
  const ni_feed        = ore_dry * d.ore_ni / 100;       // t Ni/h
  const co_feed        = ore_dry * d.ore_co / 100;       // t Co/h

  /* ── Acid Plant → U202 ─────────────────────────────── */
  const s_total        = d.sulphur_hpal + d.sulphur_byproduct;
  // S (32) → H₂SO₄ (98): factor = 98/32
  const acid_raw       = d.sulphur_hpal * (98/32) * (d.so2_conv/100);
  // at stated concentration
  const acid_solution  = acid_raw / (d.acid_conc / 100);
  const acid_water_str = acid_solution - acid_raw;       // water in acid solution
  const steam_acid_plt = d.sulphur_hpal * 0.82;         // steam generated by acid plant

  /* ── U202: HPAL ──────────────────────────────────── */
  const hpal_in        = thickened_uf + acid_solution + d.steam_to_hpal;
  const vent_gas_202   = hpal_in * 0.018;                // ~1.8% vent gas
  const hpal_disch     = hpal_in - vent_gas_202;
  const ni_recovered   = ni_feed  * (d.ni_recovery / 100);
  const co_recovered   = co_feed  * (d.co_recovery / 100);
  const ni_residue     = ni_feed  - ni_recovered;
  const co_residue     = co_feed  - co_recovered;

  /* ── U203: Recycle Leach & Slurry Neutralisation ──── */
  const neut_in        = hpal_disch + d.limestone_slurry + d.reducing_agent + d.water_203;
  // CaCO₃ + H₂SO₄ → CaSO₄·2H₂O (gypsum) — partial reaction
  const caco3_pure     = d.limestone_slurry * 0.90;     // 90% CaCO₃ in limestone slurry
  const gypsum_formed  = caco3_pure * (172/100);        // MW ratio CaCO₃→CaSO₄·2H₂O
  const neut_out       = neut_in;                       // mass conserved (gypsum stays in slurry)

  /* ── U204: CCD ──────────────────────────────────── */
  const ccd_in         = neut_out + d.wash_water_204 + d.flocculant;
  // Liquid phase (PLS)
  const pls_liquid     = ore_moisture_t + acid_water_str + d.steam_to_hpal
                         + d.water_203 + d.wash_water_204;
  const PLS_DENSITY    = 1.07; // t/m³
  const pls_vol_Lh     = (pls_liquid / PLS_DENSITY) * 1000;
  const pls_ni_gL      = pls_vol_Lh > 0 ? (ni_recovered * 1e6) / pls_vol_Lh : 0;
  const pls_co_gL      = pls_vol_Lh > 0 ? (co_recovered * 1e6) / pls_vol_Lh : 0;
  // Solid residue (hematite-rich)
  const residue_dry    = ore_dry * 0.73;                // ~73% mass retained as hematite
  const ccd_out_pls    = pls_liquid;                    // PLS to MHP
  const ccd_out_res    = ccd_in - ccd_out_pls;          // washed residue to 211-T

  /* ── MHP-1: Precipitation (NaOH 218) ──────────────── */
  const MHP_GRADE      = 0.38;                          // 38% Ni+Co in MHP
  const ni_co_total    = ni_recovered + co_recovered;
  const mhp_total      = ni_co_total / MHP_GRADE;       // t/h MHP
  const mhp_battery    = mhp_total * (d.mhp_battery_pct / 100);
  const mhp_external   = mhp_total - mhp_battery;
  const ni_frac        = ni_recovered / ni_co_total;
  const co_frac        = co_recovered / ni_co_total;
  const ni_batt        = mhp_battery  * MHP_GRADE * ni_frac;
  const co_batt        = mhp_battery  * MHP_GRADE * co_frac;
  const ni_ext         = mhp_external * MHP_GRADE * ni_frac;
  const co_ext         = mhp_external * MHP_GRADE * co_frac;
  const raffinate      = ccd_out_pls + d.naoh_218 - mhp_total;

  /* ── U205/206: Fe & Al Removal (Air 902) ──────────── */
  const fe_al_in       = Math.max(0, raffinate) + d.air_902;
  const fe_al_sludge   = fe_al_in * 0.035;
  const fe_al_out      = fe_al_in - fe_al_sludge;

  /* ── U211: Mn Removal ──────────────────────────────── */
  const mn_sludge      = fe_al_out * 0.012;
  const mn_out         = fe_al_out - mn_sludge;

  /* ── U606: Effluent Treatment → Discharge to Sea ──── */
  const eff_sludge     = mn_out * 0.004;
  const sea_discharge  = mn_out - eff_sludge;

  /* ── U211-T: Tailings Residue Neutralisation (510) ─── */
  const tailings_neut_in  = ccd_out_res + d.lime_milk_510;
  const tailings_neut_out = tailings_neut_in;

  /* ── U215: Residue Filtration ──────────────────────── */
  const filtrate_215   = tailings_neut_out * 0.18;      // ~18% filtrate
  const cake_215       = tailings_neut_out - filtrate_215;

  /* ── TSF ───────────────────────────────────────────── */
  const tsf_total      = cake_215 + fe_al_sludge + mn_sludge + eff_sludge;
  const tsf_return_water = filtrate_215;

  /* ── Overall Mass Balance ──────────────────────────── */
  // INPUTS
  const MB_IN = {
    "Mine Ore Slurry":                d.mine_ore_slurry,
    "Port Ore Slurry":                d.port_ore_slurry,
    "Process Water (→ 201)":          d.process_water_201,
    "Sulfuric Acid solution (← Acid Plant → 202)": acid_solution,
    "HPS Steam (← Acid Plant → 202)": d.steam_to_hpal,
    "Limestone Slurry (→ 203)":       d.limestone_slurry,
    "Reducing Agent (→ 203)":         d.reducing_agent,
    "Water (→ 203)":                  d.water_203,
    "Wash Water / Raffinate (→ 204)": d.wash_water_204,
    "Flocculant (→ 204)":             d.flocculant,
    "NaOH 50% — 218 (→ MHP-1)":      d.naoh_218,
    "Air — 902 (→ 205/206)":          d.air_902,
    "Lime Milk — 510 (→ 211-T)":      d.lime_milk_510,
  };

  // OUTPUTS
  const MB_OUT = {
    "MHP Product (→ Packing)":            mhp_total,
    "Vent Gas (← 202 Autoclave)":         vent_gas_202,
    "Gypsum by-product (← 203)":          gypsum_formed,
    "Discharge to Sea (← 606)":           sea_discharge,
    "TSF — Tailings (filter cake + sludge)": tsf_total,
    "Filtrate recycle (← 215)":           filtrate_215,
    "Thickener overflow recycle (← 201)": Math.max(0, overflow_201),
  };

  const total_in  = Object.values(MB_IN).reduce((a,b)=>a+b, 0);
  const total_out_before = Object.values(MB_OUT).reduce((a,b)=>a+b, 0);
  const water_balance = total_in - total_out_before;
  MB_OUT["Water balance / unaccounted"] = water_balance;
  const total_out = total_out_before + Math.max(0, water_balance);

  // Autoclave geometry
  const sv   = (thickened_uf + acid_solution + d.steam_to_hpal) / d.slurry_density;
  const V_a  = sv * d.retention_time;
  const V_g  = V_a * 1.20;
  const Vpc  = V_g / d.num_compartments;
  const D    = Math.pow((4*Vpc)/(Math.PI*3.5), 1/3);
  const L    = D * 3.5;

  return {
    u201: { ore_wet_total, ore_dry, ore_moisture_t, thickened_uf, overflow_201, slurry_in_201, ni_feed, co_feed },
    acid: { s_total, acid_raw, acid_solution, acid_water_str, steam_acid_plt },
    u202: { hpal_in, hpal_disch, vent_gas_202, ni_recovered, co_recovered, ni_residue, co_residue },
    u203: { neut_in, neut_out, gypsum_formed },
    u204: { ccd_in, pls_liquid, ccd_out_pls, ccd_out_res, pls_ni_gL, pls_co_gL, residue_dry },
    uMHP: { mhp_total, mhp_battery, mhp_external, ni_batt, co_batt, ni_ext, co_ext, raffinate },
    u205: { fe_al_in, fe_al_sludge, fe_al_out },
    u211mn: { mn_sludge, mn_out },
    u606: { eff_sludge, sea_discharge },
    u211t: { tailings_neut_in, tailings_neut_out },
    u215: { filtrate_215, cake_215 },
    tsf: { tsf_total, tsf_return_water },
    mb: { MB_IN, MB_OUT, total_in, total_out, closure: total_in - total_out },
    ac: { sv, V_a, V_g, Vpc, D, L },
    ann: {
      mhp:      mhp_total    * ANN / 1000,
      ni_total: (ni_batt+ni_ext) * ANN / 1000,
      co_total: (co_batt+co_ext) * ANN / 1000,
      ni_batt:  ni_batt      * ANN / 1000,
      ni_ext:   ni_ext       * ANN / 1000,
      tsf:      tsf_total    * ANN / 1000,
      sea:      sea_discharge* ANN / 1000,
    },
  };
}

/* ═══════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════ */
const S = {
  root:  { minHeight:"100vh", background:T.bg, color:T.t1, fontFamily:T.sans, fontSize:13 },
  hdr:   { background:T.s1, borderBottom:`1px solid ${T.line}`, padding:"13px 22px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  tabs:  { display:"flex", background:T.s1, borderBottom:`1px solid ${T.line}`, overflowX:"auto" },
  tab:   { padding:"8px 16px", cursor:"pointer", fontSize:10, fontWeight:700, letterSpacing:0.9, textTransform:"uppercase", border:"none", background:"transparent", fontFamily:T.sans, transition:"all 0.15s", whiteSpace:"nowrap" },
  wrap:  { display:"flex", maxWidth:1440, margin:"0 auto", padding:"12px 14px", gap:12, flexWrap:"wrap" },
  left:  { width:244, flexShrink:0, maxHeight:"calc(100vh - 116px)", overflowY:"auto" },
  right: { flex:1, minWidth:460, display:"flex", flexDirection:"column", gap:10 },
  grp:   { background:T.s2, border:`1px solid ${T.line}`, borderRadius:6, padding:"9px 11px", marginBottom:8 },
  gHd:   { fontSize:9, fontWeight:700, letterSpacing:1.6, textTransform:"uppercase", marginBottom:7, display:"flex", justifyContent:"space-between", cursor:"pointer" },
  field: { marginBottom:6 },
  lbl:   { fontSize:9, color:T.t3, marginBottom:2, textTransform:"uppercase", letterSpacing:0.7, display:"block" },
  iRow:  { display:"flex", alignItems:"center", gap:4 },
  inp:   { flex:1, background:T.s3, border:`1px solid ${T.line}`, borderRadius:3, padding:"3px 6px", color:T.t1, fontFamily:T.mono, fontSize:11, outline:"none", width:0 },
  unit:  { fontSize:9, color:T.t3, minWidth:30, textAlign:"right" },
  card:  { background:T.s2, border:`1px solid ${T.line}`, borderRadius:8, padding:"11px 14px" },
  cHd:   { fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8, display:"flex", alignItems:"center", gap:6 },
};

/* ── atoms ── */
function FI({label,name,value,unit,min=0,max,step="any",onChange}){
  return (
    <div style={S.field}>
      <label style={S.lbl}>{label}</label>
      <div style={S.iRow}>
        <input type="number" min={min} max={max} step={step} value={value}
          onChange={e=>onChange(name, parseFloat(e.target.value)||0)} style={S.inp}/>
        <span style={S.unit}>{unit}</span>
      </div>
    </div>
  );
}

function G({title,col,children,open:initOpen=true}){
  const[open,setOpen]=useState(initOpen);
  return(
    <div style={{...S.grp,borderLeft:`3px solid ${col}`}}>
      <div style={{...S.gHd,color:col}} onClick={()=>setOpen(o=>!o)}>
        {title}
        <span style={{color:T.t3,fontFamily:T.mono}}>{open?"▾":"▸"}</span>
      </div>
      {open&&children}
    </div>
  );
}

function R({label,v,u,hi,indent,sub,warn}){
  const fmt = typeof v==="number"
    ? (v===0?"0.000": Math.abs(v)<0.00005?"≈0.000": v.toFixed(3))
    : v;
  return(
    <div style={{
      display:"flex",justifyContent:"space-between",alignItems:"baseline",
      padding: hi?"4px 7px":"2px 0",
      borderBottom: hi?"none":`1px solid ${T.bg}`,
      marginTop: hi?2:0, borderRadius:hi?3:0,
      background: hi?T.s3:"transparent",
      paddingLeft: indent?14: hi?7:0,
    }}>
      <span style={{color:sub?T.t3:T.t2, fontSize:sub?10:11, paddingLeft:indent?8:0}}>{label}</span>
      <span style={{color:warn?T.red:hi?T.t1:T.t2, fontSize:11, fontFamily:T.mono, fontWeight:hi?700:400}}>
        {fmt} <span style={{fontSize:9,color:T.t3}}>{u}</span>
      </span>
    </div>
  );
}

function Kpi({label,v,u,col}){
  const fmt = typeof v==="number"
    ? (v>100?v.toFixed(1):v>10?v.toFixed(2):v.toFixed(3))
    : v;
  return(
    <div style={{flex:"1 1 86px",background:T.s3,border:`1px solid ${T.line}`,borderRadius:6,
      padding:"7px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
      <div style={{fontSize:8,color:T.t3,textTransform:"uppercase",letterSpacing:0.8,textAlign:"center"}}>{label}</div>
      <div style={{fontSize:16,fontWeight:700,color:col,fontFamily:T.mono}}>{fmt}</div>
      <div style={{fontSize:8,color:T.t3}}>{u}</div>
    </div>
  );
}

function Bar({pct,col,h=5}){
  return(
    <div style={{background:T.s3,borderRadius:3,height:h,width:"100%",overflow:"hidden"}}>
      <div style={{width:`${Math.min(100,Math.max(0,pct))}%`,height:"100%",borderRadius:3,background:col,transition:"width .5s"}}/>
    </div>
  );
}

function Sect({label,col}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:6,margin:"7px 0 3px"}}>
      <div style={{width:2,height:12,background:col,borderRadius:1}}/>
      <span style={{fontSize:9,color:col,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>{label}</span>
      <div style={{flex:1,height:1,background:T.line}}/>
    </div>
  );
}

/* ── BFD inline diagram ── */
function BFDSvg({calc}){
  const W=580, bw=104, bh=30, cx=238;
  // boxes: [x,y,label,col]
  const boxes=[
    [cx-52,  12, "201  Slurry Thickening",  T.water],
    [cx-52,  76, "202  HPAL",               T.acid ],
    [cx-52, 142, "203  Recycle Leach &",    T.lime ],
    [cx-52, 157, "Slurry Neutralisation",   T.lime ],
    [cx-52, 202, "204  CCD",                T.water],
    [cx-52, 268, "MHP-1  Ni & Co Precip.",  T.mhp  ],
    [cx-52, 283, "Filtration & Packing",    T.mhp  ],
    [cx-52, 332, "205/206  Fe & Al Removal",T.ore  ],
    [cx-52, 396, "211  Mn Removal",         T.eff  ],
    [cx-52, 460, "211-T  Tailings Neut.",   T.tsf  ],
    [cx-52, 524, "215  Residue Filtration", T.tsf  ],
    [cx-52, 586, "TSF",                     T.tsf  ],
  ];
  const bxH=[34,34,44,0,34,44,0,34,34,34,34,36];

  const line=(x1,y1,x2,y2,col="#3d5478",dash=false)=>(
    <line x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={col} strokeWidth="0.9"
      strokeDasharray={dash?"4 3":"none"}/>
  );
  const arr=(x1,y1,x2,y2,col=T.t3)=>{
    const id=`a${x1}${y1}${x2}${y2}`.replace(/\./g,"");
    return(<g key={id}>
      <defs><marker id={id} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto">
        <path d="M1 1.5L7 4L1 6.5" fill="none" stroke={col} strokeWidth="1.2"/>
      </marker></defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth="0.9" markerEnd={`url(#${id})`}/>
    </g>);
  };
  const txt=(x,y,s,col=T.t3,sz=8,anchor="middle",bold=false)=>(
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central"
      fontSize={sz} fill={col} fontFamily={T.sans}
      fontWeight={bold?"600":"400"}>{s}</text>
  );
  const box=(x,y,w,h,label1,label2,col)=>(
    <g key={label1}>
      <rect x={x} y={y} width={w} height={h} rx="3"
        fill={T.s2} stroke={col} strokeWidth="1.1"/>
      <text x={x+w/2} y={y+(label2?h/3:h/2)} textAnchor="middle"
        dominantBaseline="central" fontSize={8} fill={col}
        fontFamily={T.sans} fontWeight="600">{label1}</text>
      {label2&&<text x={x+w/2} y={y+2*h/3} textAnchor="middle"
        dominantBaseline="central" fontSize={7.5} fill={col}
        fontFamily={T.sans}>{label2}</text>}
    </g>
  );

  if(!calc) return(
    <svg width="100%" viewBox={`0 0 ${W} 650`} style={{display:"block"}}>
      {txt(W/2,325,"Run balance to see live stream values",T.t3,11)}
    </svg>
  );
  const c=calc;
  return(
    <svg width="100%" viewBox={`0 0 ${W} 670`} style={{display:"block"}}>
      {/* Feed sources */}
      {box(50,  6, 78,28,"Mine Ore",`${c.u201.ore_wet_total>0?(c.d?.mine_ore_slurry||300).toFixed(0):"—"} t/h`,T.ore)}
      {box(140, 6, 78,28,"Port Ore",`${c.u201.ore_wet_total>0?(c.d?.port_ore_slurry||200).toFixed(0):"—"} t/h`,T.water)}
      {box(228, 6, 58,28,"Water",   `${(c.d?.process_water_201||50).toFixed(0)} t/h`,T.water)}
      {arr(89, 34, 200, 46)}
      {arr(179,34, 210, 46)}
      {arr(257,34, 234, 46)}

      {/* 201 */}
      {box(158,42,160,36,"201  Slurry Thickening",`Out: ${c.u201.thickened_uf.toFixed(0)} t/h`,T.water)}
      {arr(238,78, 238,100)}

      {/* Acid plant */}
      {box(16, 88,100,46,"Acid Plant",null,T.acid)}
      {/* steam */}
      {arr(116,98,158,98)}
      {txt(120,93,"Steam",T.steam,7,"start")}
      {txt(120,104,`${c.acid.steam_acid_plt.toFixed(0)} t/h`,T.t3,7,"start")}
      {/* acid */}
      {arr(116,124,158,124)}
      {txt(120,118,"H₂SO₄",T.acid,7,"start")}
      {txt(120,130,`${c.acid.acid_raw.toFixed(0)} t/h`,T.t3,7,"start")}

      {/* 202 HPAL */}
      {box(158,100,160,36,"202  HPAL",`In:${c.u202.hpal_in.toFixed(0)} | Disch:${c.u202.hpal_disch.toFixed(0)} t/h`,T.acid)}
      {/* vent gas */}
      {arr(318,118,370,118)}
      {txt(372,118,"Vent gas",T.vent,7,"start")}
      {txt(372,127,`${c.u202.vent_gas_202.toFixed(1)} t/h`,T.t3,7,"start")}
      {arr(238,136,238,162)}

      {/* Reducing agent + limestone */}
      {txt(370,158,"Reducing Agent",T.reag,7,"start")}
      {arr(370,165,320,170)}
      {txt(370,174,"Limestone Slurry",T.lime,7,"start")}
      {arr(370,180,320,180)}
      {txt(370,190,"Water",T.water,7,"start")}
      {arr(370,196,320,190)}

      {/* 203 */}
      {box(158,162,160,42,"203  Recycle Leach &","Slurry Neutralisation",T.lime)}
      {arr(238,204,238,226)}

      {/* 204 */}
      {box(158,226,160,36,"204  CCD",`PLS: ${c.u204.pls_ni_gL.toFixed(1)} g/L Ni`,T.water)}
      {/* residue to 211-T */}
      {arr(158,244,90,244)}
      {line(90,244,90,492,T.tsf,true)}
      {arr(90,492,158,492)}
      {arr(238,262,238,286)}

      {/* 218 NaOH */}
      {txt(16,292,"218  NaOH",T.naoh,7,"start")}
      {txt(16,302,`${(c.d?.naoh_218||3.8).toFixed(1)} t/h`,T.t3,7,"start")}
      {arr(78,295,158,298)}

      {/* MHP-1 */}
      {box(158,286,160,44,"MHP-1  Ni & Co Precip.","& Filtration & Packing",T.mhp)}
      {/* MHP product */}
      {arr(318,308,370,308)}
      {box(370,294,96,28,"MHP Product",`${c.uMHP.mhp_total.toFixed(2)} t/h`,T.mhp)}
      {arr(238,330,238,352)}

      {/* 205/206 + 902 air */}
      {txt(370,355,"902  Air",T.reag,7,"start")}
      {txt(370,365,`${(c.d?.air_902||2.5).toFixed(1)} t/h`,T.t3,7,"start")}
      {arr(370,360,320,362)}
      {box(158,352,160,34,"205/206  Fe & Al Removal",`Raffinate in: ${c.u205.fe_al_in.toFixed(1)} t/h`,T.ore)}
      {arr(238,386,238,416)}

      {/* 211 Mn removal */}
      {box(158,416,160,34,"211  Mn Removal",`Out: ${c.u211mn.mn_out.toFixed(1)} t/h`,T.eff)}
      {/* 606 */}
      {arr(318,433,370,433)}
      {box(370,418,96,30,"606  Effluent Treat.",null,T.sea)}
      {arr(466,433,510,433)}
      {txt(512,428,"→ Sea",T.sea,8,"start")}
      {txt(512,438,`${c.u606.sea_discharge.toFixed(1)} t/h`,T.t3,7,"start")}
      {arr(238,450,238,492)}

      {/* 510 Lime Milk */}
      {txt(16,490,"510  Lime Milk",T.lime,7,"start")}
      {txt(16,500,`${(c.d?.lime_milk_510||4.2).toFixed(1)} t/h`,T.t3,7,"start")}
      {arr(78,493,158,495)}

      {/* 211-T Tailings Neut */}
      {box(158,480,160,34,"211-T  Tailings Neut.",`In: ${c.u211t.tailings_neut_in.toFixed(1)} t/h`,T.tsf)}
      {arr(238,514,238,544)}

      {/* 215 Residue Filtration */}
      {box(158,544,160,34,"215  Residue Filtration",`Cake: ${c.u215.cake_215.toFixed(1)} t/h`,T.tsf)}
      {arr(238,578,238,602)}

      {/* TSF */}
      <rect x="158" y="602" width="160" height="34" rx="3"
        fill="#3d1a00" stroke={T.tsf} strokeWidth="1.5"/>
      <text x="238" y="619" textAnchor="middle" dominantBaseline="central"
        fontSize={10} fill={T.tsf} fontFamily={T.sans} fontWeight="700">
        TSF  — {c.tsf.tsf_total.toFixed(1)} t/h
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════ */
const TABS=[
  {id:"bfd",  label:"📊  BFD + Summary"},
  {id:"unit", label:"🔬  Unit Operations"},
  {id:"mb",   label:"⚖  Full Mass Balance"},
  {id:"prod", label:"🏭  Production"},
];

export default function App(){
  const[d,setD]=useState(DEF);
  const[C,setC]=useState(null);
  const[busy,setBusy]=useState(false);
  const[tab,setTab]=useState("bfd");
  const tm=useRef(null);
  const upd=useCallback((k,v)=>setD(p=>({...p,[k]:v})),[]);
  const reset=useCallback(()=>{setD(DEF);setC(null);},[]);
  const run=useCallback(()=>{
    setBusy(true);setC(null);
    clearTimeout(tm.current);
    tm.current=setTimeout(()=>{
      const res=runCalc(d);
      res.d=d; // attach inputs for BFD diagram labels
      setC(res);
      setBusy(false);
    },700);
  },[d]);

  return(
    <div style={S.root}>
      {/* ── HEADER ── */}
      <div style={S.hdr}>
        <div>
          <div style={{fontSize:9,color:T.t3,letterSpacing:3,textTransform:"uppercase",marginBottom:2}}>
            HPAL · NPI Project · Block Flow Diagram Reference
          </div>
          <div style={{fontSize:18,fontWeight:700,fontFamily:T.mono,color:T.t1,letterSpacing:0}}>
            HPAL Mass Balance
          </div>
          <div style={{fontSize:10,color:T.t3,marginTop:1}}>
            201 → 202 → 203 → 204 → MHP-1 → 205/206 → 211 → 606 &nbsp;|&nbsp; 204 → 211-T → 215 → TSF
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={reset}
            style={{padding:"6px 12px",borderRadius:4,fontSize:10,fontWeight:600,
              background:"transparent",border:`1px solid ${T.line}`,color:T.t3,
              cursor:"pointer",fontFamily:T.sans}}>
            ↺ Reset
          </button>
          <button onClick={run} disabled={busy}
            style={{padding:"8px 22px",borderRadius:4,fontSize:12,fontWeight:700,
              cursor:busy?"not-allowed":"pointer",border:"none",fontFamily:T.mono,
              letterSpacing:0.5,display:"flex",alignItems:"center",gap:6,
              background:busy?T.s3:"linear-gradient(135deg,#1e5fa8,#3730a3)",
              color:busy?T.t3:"#fff",
              boxShadow:busy?"none":"0 2px 14px rgba(55,48,163,0.45)"}}>
            {busy
              ?<><span style={{display:"inline-block",animation:"spin .8s linear infinite"}}>⟳</span> Computing…</>
              :<>▶ Run Balance</>}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:4px;background:${T.bg}}
        ::-webkit-scrollbar-thumb{background:${T.line};border-radius:2px}
        input[type=number]::-webkit-inner-spin-button{opacity:.4}`}</style>

      {/* ── TABS ── */}
      <div style={S.tabs}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{...S.tab,
              color:tab===t.id?T.water:T.t3,
              borderBottom:`2px solid ${tab===t.id?T.water:"transparent"}`}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={S.wrap}>
        {/* ══ LEFT: INPUTS ══ */}
        <div style={S.left}>

          <G title="⛏ Ore Feed → 201" col={T.ore}>
            <FI label="Mine ore slurry" name="mine_ore_slurry" value={d.mine_ore_slurry} unit="t/h" min={1} onChange={upd}/>
            <FI label="Port ore slurry" name="port_ore_slurry" value={d.port_ore_slurry} unit="t/h" min={0} onChange={upd}/>
            <FI label="Process water (→ 201)" name="process_water_201" value={d.process_water_201} unit="t/h" onChange={upd}/>
            <FI label="Moisture content" name="ore_moisture" value={d.ore_moisture} unit="wt%" min={0} max={60} onChange={upd}/>
            <FI label="Ni grade (dry)" name="ore_ni" value={d.ore_ni} unit="%" min={0} max={5} step={0.01} onChange={upd}/>
            <FI label="Co grade (dry)" name="ore_co" value={d.ore_co} unit="%" min={0} max={2} step={0.01} onChange={upd}/>
            <FI label="Thickener u/f solids" name="thickener_uf_solids" value={d.thickener_uf_solids} unit="wt%" min={20} max={55} onChange={upd}/>
          </G>

          <G title="🔥 Acid Plant → 202" col={T.acid}>
            <FI label="Sulphur for HPAL" name="sulphur_hpal" value={d.sulphur_hpal} unit="t/h" onChange={upd}/>
            <FI label="Sulphur by-production" name="sulphur_byproduct" value={d.sulphur_byproduct} unit="t/h" onChange={upd}/>
            <FI label="H₂SO₄ concentration" name="acid_conc" value={d.acid_conc} unit="wt%" min={90} max={99} step={0.1} onChange={upd}/>
            <FI label="SO₂→SO₃ conversion" name="so2_conv" value={d.so2_conv} unit="%" min={95} max={99.9} step={0.1} onChange={upd}/>
            <FI label="HPS steam to HPAL" name="steam_to_hpal" value={d.steam_to_hpal} unit="t/h" onChange={upd}/>
          </G>

          <G title="🧱 Unit 203 — Neutralisation" col={T.lime}>
            <FI label="Limestone slurry" name="limestone_slurry" value={d.limestone_slurry} unit="t/h" step={0.1} onChange={upd}/>
            <FI label="Reducing agent" name="reducing_agent" value={d.reducing_agent} unit="t/h" step={0.01} onChange={upd}/>
            <FI label="Dilution water" name="water_203" value={d.water_203} unit="t/h" onChange={upd}/>
          </G>

          <G title="🔄 Unit 204 — CCD" col={T.water}>
            <FI label="Wash water (recycle)" name="wash_water_204" value={d.wash_water_204} unit="t/h" onChange={upd}/>
            <FI label="Flocculant (PAC+PAM)" name="flocculant" value={d.flocculant} unit="t/h" step={0.01} onChange={upd}/>
          </G>

          <G title="⚗ MHP-1 — 218 NaOH" col={T.mhp}>
            <FI label="Ni recovery" name="ni_recovery" value={d.ni_recovery} unit="%" min={50} max={99} step={0.1} onChange={upd}/>
            <FI label="Co recovery" name="co_recovery" value={d.co_recovery} unit="%" min={50} max={99} step={0.1} onChange={upd}/>
            <FI label="NaOH 50% (unit 218)" name="naoh_218" value={d.naoh_218} unit="t/h" step={0.1} onChange={upd}/>
            <FI label="MHP → Battery grade %" name="mhp_battery_pct" value={d.mhp_battery_pct} unit="%" onChange={upd}/>
          </G>

          <G title="🌬 205/206 — Fe & Al (902 Air)" col={T.ore} open={false}>
            <FI label="Air — unit 902" name="air_902" value={d.air_902} unit="t/h" step={0.1} onChange={upd}/>
          </G>

          <G title="🟫 211-T + 215 (510 Lime Milk)" col={T.tsf} open={false}>
            <FI label="Lime Milk — unit 510" name="lime_milk_510" value={d.lime_milk_510} unit="t/h" step={0.1} onChange={upd}/>
          </G>

          <G title="⚗ Autoclave Geometry" col={T.steam} open={false}>
            <FI label="Operating temp" name="autoclave_temp" value={d.autoclave_temp} unit="°C" min={230} max={270} onChange={upd}/>
            <FI label="Retention time" name="retention_time" value={d.retention_time} unit="h" min={0.25} max={5} step={0.25} onChange={upd}/>
            <FI label="No. compartments" name="num_compartments" value={d.num_compartments} unit="—" min={2} max={8} step={1} onChange={upd}/>
            <FI label="Slurry density" name="slurry_density" value={d.slurry_density} unit="t/m³" min={1.0} max={1.6} step={0.01} onChange={upd}/>
          </G>
        </div>

        {/* ══ RIGHT: OUTPUT ══ */}
        <div style={S.right}>
          {/* idle */}
          {!C&&!busy&&(
            <div style={{...S.card,textAlign:"center",padding:"54px 20px",border:`1px dashed ${T.line}`}}>
              <div style={{fontSize:32,marginBottom:10}}>📊</div>
              <div style={{color:T.t3,fontSize:13,marginBottom:4}}>Adjust parameters → click ▶ Run Balance</div>
              <div style={{color:T.t3,fontSize:10,opacity:0.6}}>
                BFD: 201 → 202 → 203 → 204 → MHP-1 → 205/206 → 211 → 606<br/>
                204 → 211-T → 215 → TSF
              </div>
            </div>
          )}
          {busy&&(
            <div style={{...S.card,textAlign:"center",padding:"54px 20px"}}>
              <div style={{fontSize:26,animation:"spin .9s linear infinite",display:"inline-block",marginBottom:8}}>⟳</div>
              <div style={{color:T.water,fontSize:12}}>Computing unit-by-unit mass balance…</div>
            </div>
          )}

          {C&&!busy&&(()=>{
            const r=C;

            /* ── TAB: BFD + SUMMARY ──────────────────────────────── */
            if(tab==="bfd") return(
              <>
                {/* KPI strip */}
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                  {[
                    {l:"Wet Ore In",   v:r.u201.ore_wet_total,     u:"t/h", col:T.ore   },
                    {l:"Thickened",    v:r.u201.thickened_uf,      u:"t/h", col:T.water },
                    {l:"HPAL Feed",    v:r.u202.hpal_in,           u:"t/h", col:T.acid  },
                    {l:"H₂SO₄ Prod",  v:r.acid.acid_raw,          u:"t/h", col:T.acid  },
                    {l:"PLS Ni",       v:r.u204.pls_ni_gL,         u:"g/L", col:T.mhp  },
                    {l:"MHP Total",    v:r.uMHP.mhp_total,         u:"t/h", col:T.mhp  },
                    {l:"Sea Disch.",   v:r.u606.sea_discharge,     u:"t/h", col:T.sea  },
                    {l:"TSF",          v:r.tsf.tsf_total,          u:"t/h", col:T.tsf  },
                  ].map(k=><Kpi key={k.l} label={k.l} v={k.v} u={k.u} col={k.col}/>)}
                </div>

                {/* BFD diagram */}
                <div style={S.card}>
                  <div style={{...S.cHd,marginBottom:4}}>
                    <span style={{color:T.water,fontSize:12}}>◈</span> Block Flow Diagram — Live Stream Values
                  </div>
                  <BFDSvg calc={r}/>
                </div>

                {/* Ni/Co bars */}
                <div style={{...S.card}}>
                  <div style={S.cHd}><span style={{color:T.mhp}}>▐</span> Metal Recovery</div>
                  <div style={{display:"flex",gap:14}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2}}>
                        <span style={{color:T.t2}}>Ni:  {r.u201.ni_feed.toFixed(3)} t/h in → {r.u202.ni_recovered.toFixed(3)} t/h recovered</span>
                        <span style={{color:T.mhp,fontFamily:T.mono}}>{d.ni_recovery.toFixed(1)}%</span>
                      </div>
                      <Bar pct={d.ni_recovery} col={T.mhp} h={7}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2}}>
                        <span style={{color:T.t2}}>Co:  {r.u201.co_feed.toFixed(3)} t/h in → {r.u202.co_recovered.toFixed(3)} t/h recovered</span>
                        <span style={{color:T.sea,fontFamily:T.mono}}>{d.co_recovery.toFixed(1)}%</span>
                      </div>
                      <Bar pct={d.co_recovery} col={T.sea} h={7}/>
                    </div>
                  </div>
                </div>
              </>
            );

            /* ── TAB: UNIT OPERATIONS ─────────────────────────────── */
            if(tab==="unit") return(
              <>
                {BFD_UNITS.map(u=>{
                  const live = {
                    "u201": [
                      {l:"Ore wet total in",    v:r.u201.ore_wet_total,   u:"t/h"},
                      {l:"Dry ore",             v:r.u201.ore_dry,         u:"t/h"},
                      {l:"Moisture carried in", v:r.u201.ore_moisture_t,  u:"t/h"},
                      {l:"Thickened u/f",       v:r.u201.thickened_uf,   u:"t/h", hi:true},
                      {l:"Overflow recycle",    v:r.u201.overflow_201,    u:"t/h"},
                    ],
                    "u202": [
                      {l:"Total HPAL feed",     v:r.u202.hpal_in,        u:"t/h"},
                      {l:"H₂SO₄ added",        v:r.acid.acid_raw,        u:"t/h"},
                      {l:"HPS steam added",     v:d.steam_to_hpal,        u:"t/h"},
                      {l:"Discharge slurry",    v:r.u202.hpal_disch,     u:"t/h", hi:true},
                      {l:"Vent gas",            v:r.u202.vent_gas_202,   u:"t/h"},
                      {l:"Ni dissolved → PLS",  v:r.u202.ni_recovered,   u:"t Ni/h"},
                      {l:"Co dissolved → PLS",  v:r.u202.co_recovered,   u:"t Co/h"},
                    ],
                    "u203": [
                      {l:"Feed in",             v:r.u203.neut_in,        u:"t/h"},
                      {l:"Gypsum precipitated", v:r.u203.gypsum_formed,  u:"t/h"},
                      {l:"Neutralised slurry out",v:r.u203.neut_out,     u:"t/h", hi:true},
                    ],
                    "u204": [
                      {l:"Total CCD feed",      v:r.u204.ccd_in,         u:"t/h"},
                      {l:"PLS to MHP-1",        v:r.u204.ccd_out_pls,    u:"t/h", hi:true},
                      {l:"PLS Ni grade",        v:r.u204.pls_ni_gL,      u:"g/L"},
                      {l:"PLS Co grade",        v:r.u204.pls_co_gL,      u:"g/L"},
                      {l:"Residue to 211-T",    v:r.u204.ccd_out_res,    u:"t/h"},
                    ],
                    "uMHP": [
                      {l:"PLS feed",            v:r.u204.ccd_out_pls,    u:"t/h"},
                      {l:"NaOH 218 added",      v:d.naoh_218,            u:"t/h"},
                      {l:"MHP product total",   v:r.uMHP.mhp_total,      u:"t/h", hi:true},
                      {l:"MHP battery grade",   v:r.uMHP.mhp_battery,    u:"t/h"},
                      {l:"MHP external sale",   v:r.uMHP.mhp_external,   u:"t/h"},
                      {l:"Raffinate → 205/206", v:Math.max(0,r.uMHP.raffinate), u:"t/h"},
                    ],
                    "u205": [
                      {l:"Raffinate + air in",  v:r.u205.fe_al_in,       u:"t/h"},
                      {l:"Fe/Al sludge → TSF",  v:r.u205.fe_al_sludge,   u:"t/h"},
                      {l:"Solution → 211 Mn",   v:r.u205.fe_al_out,      u:"t/h", hi:true},
                    ],
                    "u211mn": [
                      {l:"Feed from 205/206",   v:r.u205.fe_al_out,      u:"t/h"},
                      {l:"Mn sludge → TSF",     v:r.u211mn.mn_sludge,    u:"t/h"},
                      {l:"Solution → 606",      v:r.u211mn.mn_out,       u:"t/h", hi:true},
                    ],
                    "u606": [
                      {l:"Feed from 211",       v:r.u211mn.mn_out,       u:"t/h"},
                      {l:"Effluent sludge",     v:r.u606.eff_sludge,     u:"t/h"},
                      {l:"Discharge to Sea",    v:r.u606.sea_discharge,  u:"t/h", hi:true},
                    ],
                    "u211t": [
                      {l:"CCD residue in",      v:r.u204.ccd_out_res,    u:"t/h"},
                      {l:"Lime milk 510 added", v:d.lime_milk_510,       u:"t/h"},
                      {l:"Neutralised residue", v:r.u211t.tailings_neut_out,u:"t/h",hi:true},
                    ],
                    "u215": [
                      {l:"Neutralised residue", v:r.u211t.tailings_neut_out,u:"t/h"},
                      {l:"Filter cake → TSF",   v:r.u215.cake_215,       u:"t/h", hi:true},
                      {l:"Filtrate recycle",    v:r.u215.filtrate_215,   u:"t/h"},
                    ],
                    "uTSF": [
                      {l:"Filter cake (215)",   v:r.u215.cake_215,       u:"t/h"},
                      {l:"Fe/Al sludge (205/206)",v:r.u205.fe_al_sludge, u:"t/h"},
                      {l:"Mn sludge (211)",     v:r.u211mn.mn_sludge,    u:"t/h"},
                      {l:"Effluent sludge (606)",v:r.u606.eff_sludge,    u:"t/h"},
                      {l:"TSF TOTAL",           v:r.tsf.tsf_total,       u:"t/h", hi:true},
                    ],
                  }[u.id]||[];
                  return(
                    <div key={u.id} style={{...S.card,borderLeft:`3px solid ${u.col}`}}>
                      <div style={S.cHd}>
                        <div style={{background:u.col,color:T.bg,padding:"1px 8px",borderRadius:3,
                          fontSize:9,fontWeight:700,fontFamily:T.mono}}>{u.code}</div>
                        <span style={{color:u.col}}>{u.name}</span>
                        {u.highlight&&<span style={{fontSize:9,background:"#3d0000",color:"#fca5a5",
                          padding:"1px 7px",borderRadius:99,letterSpacing:0.8}}>SYSTEM BOUNDARY</span>}
                      </div>
                      <div style={{fontSize:10,color:T.t3,marginBottom:8,lineHeight:1.6}}>{u.desc}</div>
                      <div style={{display:"flex",gap:10,marginBottom:live.length>0?8:0}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:8,color:T.mhp,letterSpacing:1.4,textTransform:"uppercase",marginBottom:3}}>◀ Inputs</div>
                          {u.in_streams.map((s,i)=><div key={i} style={{fontSize:10,color:T.t2,marginBottom:2}}>• {s}</div>)}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:8,color:T.ore,letterSpacing:1.4,textTransform:"uppercase",marginBottom:3}}>Outputs ▶</div>
                          {u.out_streams.map((s,i)=><div key={i} style={{fontSize:10,color:T.t2,marginBottom:2}}>• {s}</div>)}
                        </div>
                      </div>
                      {live.length>0&&(
                        <div style={{borderTop:`1px solid ${T.line}`,paddingTop:7,marginTop:4}}>
                          <div style={{fontSize:8,color:T.t3,letterSpacing:1.2,textTransform:"uppercase",marginBottom:4}}>Live stream values</div>
                          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                            {live.map((row,i)=><div key={i} style={{flex:"1 1 130px"}}>
                              <R label={row.l} v={row.v} u={row.u} hi={row.hi}/>
                            </div>)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            );

            /* ── TAB: FULL MASS BALANCE ───────────────────────────── */
            if(tab==="mb") return(
              <>
                <div style={S.card}>
                  <div style={S.cHd}><span style={{color:T.mhp}}>▐</span> All Mass INPUTS</div>
                  {Object.entries(r.mb.MB_IN).map(([k,v])=><R key={k} label={k} v={v} u="t/h"/>)}
                  <R label="TOTAL MASS IN" v={r.mb.total_in} u="t/h" hi/>
                </div>
                <div style={S.card}>
                  <div style={S.cHd}><span style={{color:T.ore}}>▐</span> All Mass OUTPUTS</div>
                  {Object.entries(r.mb.MB_OUT).map(([k,v])=><R key={k} label={k} v={v} u="t/h" warn={k.includes("unaccounted")&&v>1}/>)}
                  <R label="TOTAL MASS OUT" v={r.mb.total_out} u="t/h" hi/>
                  <div style={{display:"flex",justifyContent:"space-between",borderTop:`1px solid ${T.line}`,marginTop:8,paddingTop:7}}>
                    <span style={{fontSize:11,color:T.t3}}>Balance closure (In − Out)</span>
                    <span style={{fontFamily:T.mono,fontSize:12,fontWeight:700,
                      color:Math.abs(r.mb.closure)<0.1?T.mhp:T.red}}>
                      {r.mb.closure.toFixed(4)} t/h
                    </span>
                  </div>
                </div>

                {/* Autoclave sizing */}
                <div style={{...S.card,borderLeft:`3px solid ${T.steam}`}}>
                  <div style={S.cHd}><span style={{color:T.steam}}>▐</span> Autoclave Sizing ({d.num_compartments} Compartments)</div>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                    <div style={{flex:1}}>
                      <R label="Slurry volumetric flow"        v={r.ac.sv}   u="m³/h"/>
                      <R label="Active volume (Q × τ)"         v={r.ac.V_a}  u="m³"/>
                      <R label="Gross volume (+20% freeboard)" v={r.ac.V_g}  u="m³" hi/>
                    </div>
                    <div style={{flex:1}}>
                      <R label="Volume per compartment"        v={r.ac.Vpc}  u="m³" hi/>
                      <R label="Diameter per compartment"      v={r.ac.D}    u="m"/>
                      <R label="Length per compartment (L/D=3.5)" v={r.ac.L} u="m"/>
                      <R label="Total shell length"            v={r.ac.L*d.num_compartments} u="m" hi/>
                    </div>
                  </div>
                </div>
              </>
            );

            /* ── TAB: PRODUCTION ──────────────────────────────────── */
            if(tab==="prod") return(
              <>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                  {[
                    {l:"MHP/yr",       v:r.ann.mhp,      u:"kt/yr", col:T.mhp   },
                    {l:"Ni total/yr",  v:r.ann.ni_total,  u:"kt/yr", col:T.mhp   },
                    {l:"Co total/yr",  v:r.ann.co_total,  u:"kt/yr", col:T.sea   },
                    {l:"Ni battery/yr",v:r.ann.ni_batt,   u:"kt/yr", col:T.water },
                    {l:"Ni ext./yr",   v:r.ann.ni_ext,    u:"kt/yr", col:T.ore   },
                    {l:"TSF/yr",       v:r.ann.tsf,       u:"kt/yr", col:T.tsf   },
                    {l:"Sea disch./yr",v:r.ann.sea,       u:"kt/yr", col:T.sea   },
                  ].map(k=><Kpi key={k.l} label={k.l} v={k.v} u={k.u} col={k.col}/>)}
                </div>

                <div style={S.card}>
                  <div style={S.cHd}><span style={{color:T.mhp}}>▐</span> MHP Production (← MHP-1)</div>
                  <Sect label="MHP for Battery Materials" col={T.water}/>
                  <R label="MHP battery grade" v={r.uMHP.mhp_battery} u="t/h"/>
                  <R label="  Ni content" v={r.uMHP.ni_batt} u="t Ni/h" indent/>
                  <R label="  Co content" v={r.uMHP.co_batt} u="t Co/h" indent/>
                  <R label="  Ni annual (@91%)" v={r.ann.ni_batt} u="kt Ni/yr" hi/>
                  <Sect label="MHP for External Sale" col={T.ore}/>
                  <R label="MHP external sale" v={r.uMHP.mhp_external} u="t/h"/>
                  <R label="  Ni content" v={r.uMHP.ni_ext} u="t Ni/h" indent/>
                  <R label="  Co content" v={r.uMHP.co_ext} u="t Co/h" indent/>
                  <R label="  Ni annual (@91%)" v={r.ann.ni_ext} u="kt Ni/yr" hi/>
                  <Sect label="Total MHP" col={T.mhp}/>
                  <R label="MHP total" v={r.uMHP.mhp_total} u="t/h" hi/>
                  <R label="MHP annual" v={r.ann.mhp} u="kt/yr"/>
                </div>

                <div style={S.card}>
                  <div style={S.cHd}><span style={{color:T.tsf}}>▐</span> Waste & Effluent (← 215 / 606 / TSF)</div>
                  <R label="Filter cake → TSF (← 215)" v={r.u215.cake_215} u="t/h"/>
                  <R label="Fe/Al sludge → TSF (← 205/206)" v={r.u205.fe_al_sludge} u="t/h"/>
                  <R label="Mn sludge → TSF (← 211)" v={r.u211mn.mn_sludge} u="t/h"/>
                  <R label="Effluent sludge → TSF (← 606)" v={r.u606.eff_sludge} u="t/h"/>
                  <R label="TSF total" v={r.tsf.tsf_total} u="t/h" hi/>
                  <R label="Discharge to Sea (← 606)" v={r.u606.sea_discharge} u="t/h" hi/>
                  <R label="Vent gas (← 202)" v={r.u202.vent_gas_202} u="t/h"/>
                </div>

                <div style={{...S.card,borderLeft:`2px solid ${T.line2}`,fontSize:10,color:T.t3,lineHeight:1.8}}>
                  <b style={{color:T.t2}}>Basis:</b> 8,760 h/yr × 91% uptime = 7,972 h/yr ·
                  MHP grade: 38% Ni+Co · TSF residue: &gt;50% Fe₂O₃ (hematite), low ARD risk ·
                  Sea discharge: treated effluent from Unit 606
                </div>
              </>
            );

            return null;
          })()}
        </div>
      </div>

      <div style={{textAlign:"center",padding:"8px 0 14px",fontSize:9,color:T.t3,letterSpacing:1,textTransform:"uppercase"}}>
        HPAL Mass Balance · BFD: 201→202→203→204→MHP-1→205/206→211→606 · 204→211-T→215→TSF · t/h unless stated
      </div>
    </div>
  );
}
