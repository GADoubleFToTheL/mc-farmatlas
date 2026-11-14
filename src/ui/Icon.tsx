/** Eigene, schlichte Linien-Icons (24 × 24). */
const PATHS = {
  search: 'M10.5 4a6.5 6.5 0 1 0 4.1 11.6l4.4 4.4 1.4-1.4-4.4-4.4A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z',
  filter: 'M3 5h18v2H3V5Zm4 6h10v2H7v-2Zm3 6h4v2h-4v-2Z',
  star: 'm12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9l-5.4 2.9 1.1-6.1L3.2 9.4l6.1-.8L12 3Z',
  back: 'M14.7 5.3 8 12l6.7 6.7 1.4-1.4L10.8 12l5.3-5.3-1.4-1.4Z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z',
  minus: 'M5 11h14v2H5v-2Z',
  check: 'm9.5 16.2-4.2-4.2-1.4 1.4 5.6 5.6 11-11-1.4-1.4-9.6 9.6Z',
  close: 'm6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z',
  settings:
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.5 3.5c0-.5 0-1-.1-1.4l2-1.5-2-3.4-2.3.9c-.7-.6-1.5-1-2.4-1.4L15.3 3h-4l-.4 2.2c-.9.3-1.7.8-2.4 1.4l-2.3-.9-2 3.4 2 1.5a8.6 8.6 0 0 0 0 2.8l-2 1.5 2 3.4 2.3-.9c.7.6 1.5 1 2.4 1.4l.4 2.2h4l.4-2.2c.9-.3 1.7-.8 2.4-1.4l2.3.9 2-3.4-2-1.5c.1-.4.1-.9.1-1.4Z',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-7 9.3L12 16l7-3.7 2 1.1-9 5-9-5 2-1.1Z',
  hammer: 'M13.8 3.2 20.8 10.2 18 13l-2.1-2.1-9.2 9.2a2 2 0 0 1-2.8-2.8l9.2-9.2L11 6l2.8-2.8Z',
  list: 'M4 6h2v2H4V6Zm4 0h12v2H8V6Zm-4 5h2v2H4v-2Zm4 0h12v2H8v-2Zm-4 5h2v2H4v-2Zm4 0h12v2H8v-2Z',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-1 7h2v7h-2v-7Zm0-3h2v2h-2V7Z',
  download: 'M11 4h2v8.2l3.3-3.3 1.4 1.4L12 16l-5.7-5.7 1.4-1.4L11 12.2V4ZM5 18h14v2H5v-2Z',
  upload: 'M12 4l5.7 5.7-1.4 1.4L13 7.8V16h-2V7.8L7.7 11.1 6.3 9.7 12 4ZM5 18h14v2H5v-2Z',
  external: 'M14 4h6v6h-2V7.4l-7.3 7.3-1.4-1.4L16.6 6H14V4ZM5 6h6v2H7v9h9v-4h2v6H5V6Z',
  warn: 'M12 3 2 20h20L12 3Zm-1 7h2v5h-2v-5Zm0 6h2v2h-2v-2Z',
  eye: 'M12 6c5 0 8.5 4 9.5 6-1 2-4.500 6-9.5 6s-8.5-4-9.5-6c1-2 4.5-6 9.5-6Zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  reset: 'M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm-1-5h2v3h-2V2Zm0 17h2v3h-2v-3ZM2 11h3v2H2v-2Zm17 0h3v2h-3v-2ZM4.9 3.500 7 5.600 5.600 7 3.500 4.900 4.900 3.500Zm12.100 13.500 2.100 2.100-1.400 1.400-2.100-2.100 1.400-1.400ZM19.100 3.500l1.400 1.400L18.400 7 17 5.600l2.100-2.100ZM7 18.400 4.900 20.500 3.500 19.100 5.600 17 7 18.400Z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'size-5', filled = true }: { name: IconName; className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d={PATHS[name]}
        fill={filled ? 'currentColor' : 'none'}
        stroke={filled ? 'none' : 'currentColor'}
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
        fillRule="evenodd"
      />
    </svg>
  );
}
