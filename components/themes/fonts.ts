export const fontPairs = {
  inter: {
    id: 'inter',
    name: 'Inter / System',
    body: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    heading: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
  },
  serif: {
    id: 'serif',
    name: 'Serif',
    body: 'Georgia, Cambria, "Times New Roman", Times, serif',
    heading: 'Georgia, Cambria, "Times New Roman", Times, serif',
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    body: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    heading: 'Montserrat, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
  },
}

export type FontPairKey = keyof typeof fontPairs

export default fontPairs
