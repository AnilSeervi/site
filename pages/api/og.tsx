/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og';
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'experimental-edge'
};

const hubotFont = fetch(
  new URL('../../public/fonts/Hubot-Sans-Regular.ttf', import.meta.url)
).then((res) => res.arrayBuffer());

// const monaFont = fetch(
//   new URL('../../public/fonts/Mona-Sans-Medium.ttf', import.meta.url)
// ).then((res) => res.arrayBuffer());

export default async function handler(req: NextRequest, res: NextResponse) {
  const hubotFontBuffer = await hubotFont;
  const { searchParams } = req.nextUrl;
  const preTitle = searchParams.get('preTitle');
  const title = searchParams.get('title');
  const url = searchParams.get('url');
  const image =
    searchParams.get('image') || `unsplash/photo-1638482856830-16b0e15fcf2c`;
  const isUnsplash = image?.includes('unsplash');
  const description = searchParams.get('description');
  return new ImageResponse(
    (
      <div
        tw="bg-zinc-900 h-full w-full flex pl-40 pr-24 py-28 text-slate-50"
        style={{ fontFamily: 'Hubot Sans' }}
      >
        <div tw="w-[63%] h-full flex flex-col justify-between pr-20">
          <div tw="flex flex-col">
            {preTitle && (
              <h2 tw="text-5xl text-[#a9adc1] mb-8 tracking-wide">
                {preTitle}
              </h2>
            )}
            <h1 tw="text-8xl leading-normal tracking-wide">{title}</h1>
            {description && (
              <p tw="text-3xl mt-8 text-[#a9adc1] tracking-wide">
                {description}
              </p>
            )}
          </div>
          <div tw="flex items-center w-full">
            <svg
              width="220"
              height="220"
              viewBox="0 0 220 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="220" height="220" rx="110" fill="black" />
              <path
                d="M78.277 72C76.8419 72 75.5977 71.9998 72.9977 77.4707C70.3977 82.9416 40.8734 141.154 40.6537 141.595C38.9729 144.97 41.0443 147.037 41.2112 147.205C41.3782 147.372 43.1377 149.128 46.6015 147.534C47.5011 147.12 122.143 112.567 122.143 112.567C125.283 110.991 126.062 111.536 126.257 111.672C126.452 111.808 127.239 112.358 126.432 115.566C125.676 117.992 117.224 143.479 116.657 144.795C115.381 147.757 114.209 147.978 113.733 147.976C113.257 147.975 112.026 147.757 110.896 144.795C110.896 144.795 86.0308 82.9415 83.7083 77.4707C81.3859 71.9999 79.7121 72 78.277 72Z"
                stroke="white"
                stroke-width="8"
                stroke-linecap="square"
                stroke-linejoin="round"
              />
              <path
                d="M148.024 111.598L135.285 148.152M180.03 78.7828L155.835 148.152"
                stroke="white"
                stroke-width="8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            <div tw="text-[#a9adc1] flex flex-col ml-16 flex-1">
              <p tw="text-7xl tracking-wide">Anil Seervi</p>
              <p tw="text-4xl -mt-3 w-full tracking-wide mt-1 leading-tight">
                {url}
              </p>
            </div>
          </div>
        </div>
        <div tw="w-[37%] flex h-full rounded-lg">
          <img
            tw="rounded-lg"
            src={
              isUnsplash
                ? `https://images.unsplash.com/${
                    image.split('/')[1]
                  }?q=80&fmt=webp&crop=entropy&w=1920&h=1080`
                : image
            }
            alt="image"
            style={{
              objectFit: 'cover',
              objectPosition: 'center',
              width: '100%',
              height: '100%'
            }}
          />
        </div>
      </div>
    ),
    {
      height: 1256,
      width: 2400,
      fonts: [
        {
          name: 'Hubot Sans',
          data: hubotFontBuffer,
          style: 'normal'
        }
      ]
    }
  );
}
