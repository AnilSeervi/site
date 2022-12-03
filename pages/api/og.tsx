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
        tw="bg-zinc-900 h-full w-full flex pl-28 pr-20 py-24 text-slate-50"
        style={{ fontFamily: 'Hubot Sans' }}
      >
        <div tw="w-[63%] h-full flex flex-col justify-between pr-20">
          <div tw="flex flex-col">
            {preTitle && (
              <h2 tw="text-4xl text-[#a9adc1] mb-4 tracking-wide">
                {preTitle}
              </h2>
            )}
            <h1 tw="text-7xl leading-normal tracking-wide">{title}</h1>
            {description && (
              <p tw="text-2xl mt-4 text-[#a9adc1] tracking-wide">
                {description}
              </p>
            )}
          </div>
          <div tw="flex items-center w-full">
            <svg
              width="170"
              height="170"
              viewBox="0 0 170 170"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="170" height="170" rx="85" fill="black" />
              <path
                d="M59.8547 55C58.7354 55 57.765 54.9998 55.7371 59.267C53.7091 63.5341 30.6812 108.938 30.5099 109.282C29.1989 111.914 30.8145 113.527 30.9447 113.657C31.0749 113.787 32.4473 115.157 35.149 113.914C35.8506 113.591 94.0688 86.641 94.0688 86.641C96.5175 85.4113 97.1258 85.8366 97.2778 85.9429C97.4299 86.0493 98.0433 86.4781 97.4143 88.98C96.8246 90.8721 90.2321 110.751 89.7899 111.777C88.7943 114.088 87.8807 114.26 87.5094 114.259C87.1381 114.258 86.1777 114.088 85.2962 111.777C85.2962 111.777 65.9024 63.534 64.091 59.267C62.2796 54.9999 60.9741 55 59.8547 55Z"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="square"
                strokeLinejoin="round"
              />
              <path
                d="M114.254 85.885L104.318 114.396M139.218 60.2904L120.347 114.396"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div tw="text-[#a9adc1] flex flex-col ml-6 flex-1">
              <p tw="text-5xl tracking-wide">Anil Seervi</p>
              <p tw="text-2xl -mt-3 w-full tracking-wide mt-1 leading-tight">
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
                  }?q=100&fmt=webp&crop=entropy&w=1920&h=1080`
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
      height: 942,
      width: 1800,
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
