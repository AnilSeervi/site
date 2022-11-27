import { sanityProjectId } from './constants';

export const urlForImage = (source) => {
  const imageArr = source.asset._ref.split('-');
  const imageId = [imageArr[1], imageArr[2]].join('-');
  const imageExtension = imageArr[imageArr.length - 1];
  return `https://cdn.sanity.io/images/${sanityProjectId}/production/${imageId}.${imageExtension}`;
};

export const sanityImageId = (source) => {
  const imageArr = source.asset._ref.split('-');
  const imageId = [imageArr[1], imageArr[2]].join('-');
  return imageId;
};
