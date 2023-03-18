import { MyMangaList } from 'lib/types';
import AnimeCardImage from './AnimeCardImage';

const getEps = (manga: MyMangaList) => {
  if (
    manga.my_list_status.num_chapters_read === 0 ||
    manga.my_list_status.num_chapters_read === manga.num_chapters
  )
    return `${manga.num_chapters} Chap`;
  return `${manga.my_list_status.num_chapters_read} / ${
    manga.num_chapters || '??'
  } Chap`;
};

function MangaCard({ manga }: { manga: MyMangaList }) {
  return (
    <div
      key={manga.id}
      className="flex flex-col overflow-hidden rounded-md bg-white shadow dark:bg-gray-800"
    >
      <div className="relative">
        <AnimeCardImage
          src={manga.main_picture.large}
          alt={manga.title}
          width={400}
          height={600}
          className="aspect-[2/3] object-cover"
        />
        <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-transparent  via-gray-700 to-gray-800  p-2 text-xs text-white dark:pb-0">
          {manga.title}
        </p>
      </div>
      <div className="p-2 pt-[0.4rem]">
        <div className="flex justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Score: {manga.my_list_status.score || 'TBD'}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {getEps(manga)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default MangaCard;
