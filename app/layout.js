import './globals.css';

export const metadata = { title: 'TAKAKO WORLD', description: 'Comics, novels, games, music and fortune.' };

export default function RootLayout({ children }) {
  return <html lang="ko"><body><header className="siteHeader"><a className="brand" href="/">TAKAKO WORLD</a><nav>{['COMICS','NOVELS','GAMES','MUSIC','FORTUNE','CHARACTERS','BLOG','MY'].map(x=><a key={x} href={'/'+x.toLowerCase()}>{x}</a>)}</nav></header>{children}<footer>© TAKAKO WORLD</footer></body></html>;
}
