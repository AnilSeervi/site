function RootHead() {
  return (
    <>
      <link
        color="#4a9885"
        href="/static/favicons/masked-icon.svg"
        rel="mask-icon"
      />
      <link
        rel="alternate icon"
        href="/static/favicons/favicon_32x32.png"
        type="image/png"
      />
      <link
        rel="icon"
        type="image/svg+xml"
        href="/static/favicons/favicon.svg"
      />
      <link href="/static/favicons/favicon.ico" rel="shortcut icon" />
      <link href="/static/favicons/site.webmanifest" rel="manifest" />
      <link
        href="/static/favicons/apple-touch-icon.png"
        rel="apple-touch-icon"
        sizes="180x180"
      />
      <meta content="#ffffff" name="theme-color" />
      <meta content="#ffffff" name="msapplication-TileColor" />
      <meta
        content="/static/favicons/browserconfig.xml"
        name="msapplication-config"
      />
    </>
  );
}

export default RootHead;
