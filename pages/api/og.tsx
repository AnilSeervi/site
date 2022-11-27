/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og';
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'experimental-edge'
};

export default async function handler(req: NextRequest, res: NextResponse) {
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
      <div tw="bg-zinc-900 h-full w-full flex pl-40 pr-24 py-28 text-slate-50">
        <div tw="w-[63%] h-full flex flex-col justify-between pr-20">
          <div tw="flex flex-col">
            {preTitle && <h2 tw="text-5xl text-[#a9adc1] mb-8">{preTitle}</h2>}
            <h1 tw="text-8xl leading-[1.1]">{title}</h1>
            {description && (
              <p tw="text-3xl mt-8 text-[#a9adc1]">{description}</p>
            )}
          </div>
          <div tw="flex items-center w-full">
            <img
              src="https://github.com/anilseervi.png"
              alt="logo"
              width={220}
              height={220}
            />
            <div tw="text-[#a9adc1] flex flex-col ml-16 flex-1">
              <p tw="text-7xl">Anil Seervi</p>
              <p tw="text-4xl -mt-3 w-full">{url}</p>
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
                  }?q=80&fit=clamp&fmt=webp&w=1920&h=1080`
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
      width: 2400
      // debug: true
    }
  );
}
