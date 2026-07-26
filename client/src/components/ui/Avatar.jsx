export function Avatar({ src, name = 'User' }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return src ? <img className="avatar" src={src} alt={name} /> : <span className="avatar">{initials}</span>;
}
