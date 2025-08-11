'use client'
const items = [
  { id: 'profile', label: 'Profile Summary' },
  { id: 'overall', label: 'Overall Strategy' },
  { id: 'platforms', label: 'Platform Strategies' },
  { id: 'roadblocks', label: 'Roadblocks' },
  { id: 'next', label: 'Next Steps' },
  { id: 'charts', label: 'Charts' },
]

export default function TOC() {
  return (
    <nav className="sticky top-24 hidden lg:block">
      <ul className="space-y-2 text-sm">
        {items.map(i => (
          <li key={i.id}>
            <a href={`#${i.id}`} className="text-gray-600 hover:text-black">{i.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}