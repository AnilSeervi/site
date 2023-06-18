/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/server';
import { websiteURL } from 'lib/constants';
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'edge'
};

const kaiseiFont = fetch(
  new URL('../../public/fonts/kaisei-tokumin-bold.ttf', import.meta.url)
).then((res) => res.arrayBuffer());

export default async function handler(req: NextRequest, res: NextResponse) {
  const kaiseiFontBuffer = await kaiseiFont;
  const { searchParams } = req.nextUrl;
  const preTitle = searchParams.get('preTitle');
  const title = searchParams.get('title');
  const url = searchParams.get('url');
  const image =
    searchParams.get('image') || `unsplash/photo-1638482856830-16b0e15fcf2c`;
  const isUnsplash = image?.includes('unsplash');
  const description = searchParams.get('description');
  console.log(isUnsplash);
  return new ImageResponse(
    (
      <div
        style={{
          fontFamily: 'Kaisei Tokumin',
          height: '100%',
          width: '100%',
          display: 'flex',
          background: `url(${websiteURL}/og-bg.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div
          style={{
            marginTop: '-0.5em',
            paddingLeft: 84,
            paddingRight: 40,
            width: isUnsplash ? '63%' : '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            fontSize: 68,
            letterSpacing: '-0.05em',
            fontStyle: 'normal',
            color: 'white',
            lineHeight: '72px',
            whiteSpace: 'pre-wrap'
          }}
        >
          {title}
        </div>
        {isUnsplash && (
          <div
            style={{
              width: '37%',
              height: '100%',
              display: 'flex',
              borderRadius: 8,
              paddingTop: 64,
              paddingBottom: 64,
              paddingRight: 64
            }}
          >
            <img
              src={
                isUnsplash
                  ? `https://images.unsplash.com/${
                      image.split('/')[1]
                    }?q=100&fmt=webp&crop=entropy&w=1280&h=720`
                  : image
              }
              alt="image"
              style={{
                objectFit: 'cover',
                objectPosition: 'center',
                width: '100%',
                height: '100%',
                borderRadius: 8
              }}
            />
          </div>
        )}
      </div>
    ),
    {
      height: 720,
      width: 1280,
      fonts: [
        {
          name: 'Kaisei Tokumin',
          data: kaiseiFontBuffer,
          style: 'normal'
        }
      ]
    }
  );
}
