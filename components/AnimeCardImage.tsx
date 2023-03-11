'use client';

import React, { useEffect, useState } from 'react';
import { cn } from 'utils';

type props = {
  src: string;
  alt: string;
  height: number;
  width: number;
  placeHolder?: string;
  className?: string;
  [key: string]: any;
};

function AnimeCardImage(props) {
  const { src, alt, height, width, placeHolder, className, ...otherProps } =
    props;
  const [imgSrc, setSrc] = useState({
    loading: true,
    imgSrc: placeHolder || src
  });

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setSrc({ loading: false, imgSrc: src });

    return () => {
      img.onload = null;
    };
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc.imgSrc}
      alt={alt}
      height={height}
      width={width}
      className={cn(
        imgSrc.loading
          ? 'scale-110 blur-lg grayscale'
          : 'scale-100 blur-0 grayscale-0',
        'duration-1000 ease-in-out',
        className
      )}
      loading="lazy"
      {...otherProps}
    />
  );
}

export default AnimeCardImage;
