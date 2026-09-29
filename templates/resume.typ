// Single-column A4 resume, ATS-first: real text, conventional headings, one
// column, no graphics, no icons, nothing important in header/footer.
// Receives the JSON produced by the CLI through --input, so no Typst source is
// ever assembled in Python.

// --- palette ---------------------------------------------------------------
// Explicit hex only. Never rely on a color function's default: a bare number
// passed to `luma()` evaluates to white in Typst 0.15, which renders the whole
// document invisible on a white page.
#let ink = rgb("#141414") // primary text
#let ink-soft = rgb("#3c3c3c") // secondary text
#let ink-mute = rgb("#5c5c5c") // dates, meta
#let hairline = rgb("#9e9e9e") // section rules

// System sans, with a fallback chain so another machine still builds.
#let sans = ("Segoe UI", "Calibri", "Arial")

#set page(paper: "a4", margin: (x: 1.6cm, y: 1.3cm), fill: white)
#set text(font: sans, size: 9.5pt, fill: ink, lang: "en")
#set par(leading: 0.58em, justify: false, spacing: 0.3em)
#set list(indent: 1.05em, body-indent: 0.45em, marker: [•], spacing: 0.22em)

#let data = json(sys.inputs.resume)
#let personal = data.personal

// Optional profile fields arrive as JSON null when omitted, and Typst has no
// implicit truthiness: an empty string and a null must both be filtered out.
#let filled(value) = value != none and value != ""

// Uppercase label over a hairline. No letter tracking: wide tracking makes text
// extractors insert phantom spaces ("L ANGUAGES"), which breaks ATS section
// detection. The heading text alone carries the information.
// Spacing uses `pad` inside the block on purpose: a `v(weak: true)` and any
// spacing at the top of a block are dropped, and `block(above:)` is weak
// spacing, so all three silently collapse to zero here.
#let section(title) = block(width: 100%)[
  #pad(top: 1.7em, bottom: 0.5em)[
    #text(size: 9pt, weight: "bold")[#upper(title)]
    #v(0.22em)
    #line(length: 100%, stroke: 0.4pt + hairline)
  ]
]

// Role on the left, period on the right, employer underneath.
// A grid, not a table: it still extracts as ordinary left-to-right text.
#let entry(title, meta, period) = block(width: 100%)[
  #pad(top: 0.42em, bottom: 0.32em)[
    #grid(
      columns: (1fr, auto),
      column-gutter: 0.8em,
      align: (left + bottom, right + bottom),
      text(weight: "bold", size: 10pt)[#title],
      text(size: 8.5pt, fill: ink-mute)[#period],
    )
    #if filled(meta) [
      #text(size: 8.7pt, fill: ink-soft)[#meta]
    ]
  ]
]

#let contact = (
  personal.location,
  personal.email,
  personal.phone,
  personal.github,
  personal.linkedin,
).filter(it => it != none and it != "").join(" · ")

// --- header ----------------------------------------------------------------
#text(size: 22pt, weight: "bold")[#personal.name]
#v(0.5em)
#text(size: 11pt, fill: ink-soft)[#personal.title]
#if filled(contact) [
  #v(0.45em)
  #text(size: 8.5pt, fill: ink-mute)[#contact]
  #v(0.5em)
  #line(length: 100%, stroke: 0.7pt + ink)
]

// --- summary ---------------------------------------------------------------
#if filled(data.summary) [
  #section("Summary")
  #text(size: 9.5pt)[#data.summary]
]

// --- experience ------------------------------------------------------------
#if data.experience.len() > 0 [
  #section("Experience")
  #for item in data.experience [
    #entry(item.role, item.company, item.period)
    #list(..item.achievements.map(a => [#a.text]))
  ]
]

// --- skills ----------------------------------------------------------------
// Categories when the profile defines them, otherwise the flat list.
#if data.skills.len() > 0 or data.skill_categories.len() > 0 [
  #section("Skills")
  #if data.skill_categories.len() > 0 [
    #grid(
      columns: (auto, 1fr),
      column-gutter: 0.7em,
      row-gutter: 0.32em,
      align: (left + top, left + top),
      ..data.skill_categories
        .map(group => (
          text(size: 9pt, weight: "bold", fill: ink-soft)[#group.name],
          text(size: 9pt)[#group.skills.join(", ")],
        ))
        .flatten(),
    )
  ] else [
    #text(size: 9.5pt)[#data.skills.join(", ")]
  ]
]

// --- projects --------------------------------------------------------------
#if data.projects.len() > 0 [
  #section("Projects")
  #for project in data.projects [
    #block(width: 100%)[
      #pad(top: 0.42em, bottom: 0.3em)[
        #text(size: 10pt, weight: "bold")[#project.name]
        #if filled(project.url) [
          #h(0.4em)
          #text(size: 8.7pt, fill: ink-mute)[#project.url]
        ]
        #v(0.12em)
        #text(size: 9pt)[#project.description]
      ]
    ]
  ]
]

// --- education -------------------------------------------------------------
#if data.education.len() > 0 [
  #section("Education")
  #for item in data.education [
    #entry(item.degree, item.institution, item.period)
  ]
]

// --- languages -------------------------------------------------------------
#if data.languages.len() > 0 [
  #section("Languages")
  #grid(
    columns: (1fr, auto),
    column-gutter: 0.8em,
    row-gutter: 0.2em,
    align: (left + top, right + top),
    ..data.languages
      .map(l => (
        text(size: 9.5pt)[#l.name],
        text(size: 9pt, fill: ink-mute)[#l.level],
      ))
      .flatten(),
  )
]
