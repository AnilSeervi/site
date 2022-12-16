// const client_id = process.env.TWITTER_CLIENT_ID;
// const client_secret = process.env.TWITTER_CLIENT_SECRET;
// const refresh_token = process.env.TWITTER_OAUTH_REFRESH_TOKEN;
const access_token = process.env.TWITTER_OAUTH_ACCESS_TOKEN;

// const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

// const TOKEN_ENDPOINT = 'https://api.twitter.com/2/oauth2/token?';
const BOOKMARKS_ENDPOINT = `https://api.twitter.com/2/users/${2496313362}/bookmarks`;

// const getAccessToken = async () => {
//   const response = await fetch(
//     TOKEN_ENDPOINT +
//       new URLSearchParams({
//         grant_type: 'refresh_token',
//         refresh_token
//       }),
//     {
//       method: 'POST',
//       headers: {
//         Authorization: `Basic ${basic}`,
//         'Content-Type': 'application/x-www-form-urlencoded'
//       }
//     }
//   );
//   return response.json();
// };

export const getBookmarkedTweets = async () => {
  // const { access_token } = await getAccessToken();

  const queryParams = new URLSearchParams({
    expansions:
      'author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id',
    'tweet.fields':
      'attachments,author_id,public_metrics,created_at,id,in_reply_to_user_id,referenced_tweets,text',
    'user.fields': 'id,name,profile_image_url,protected,url,username,verified',
    'media.fields':
      'duration_ms,height,media_key,preview_image_url,type,url,width,public_metrics,alt_text'
  });
  const response = await fetch(`${BOOKMARKS_ENDPOINT}?${queryParams}`, {
    headers: {
      Authorization: `Bearer ${access_token}`
    }
  });

  const tweets = await response.json();

  const getAuthorInfo = (author_id) => {
    return tweets.includes.users.find((user) => user.id === author_id);
  };

  const getReferencedTweets = (mainTweet) => {
    return (
      mainTweet?.referenced_tweets?.map((referencedTweet) => {
        const fullReferencedTweet = tweets.includes.tweets.find(
          (tweet) => tweet.id === referencedTweet.id
        );

        return {
          type: referencedTweet.type,
          author: getAuthorInfo(fullReferencedTweet.author_id),
          ...fullReferencedTweet
        };
      }) || []
    );
  };

  return (
    tweets.data?.reduce((allTweets, tweet) => {
      const tweetWithAuthor = {
        ...tweet,
        media:
          tweet?.attachments?.media_keys.map((key) =>
            tweets.includes.media.find((media) => media.media_key === key)
          ) || [],
        referenced_tweets: getReferencedTweets(tweet),
        author: getAuthorInfo(tweet.author_id)
      };

      return [tweetWithAuthor, ...allTweets];
    }, []) || [] // If the Twitter API key isn't set, don't break the build
  );
};

export const getTweets = async (ids) => {
  if (ids.length === 0) {
    return [];
  }

  const queryParams = new URLSearchParams({
    ids: ids.join(','),
    expansions:
      'author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id',
    'tweet.fields':
      'attachments,author_id,public_metrics,created_at,id,in_reply_to_user_id,referenced_tweets,text',
    'user.fields': 'id,name,profile_image_url,protected,url,username,verified',
    'media.fields':
      'duration_ms,height,media_key,preview_image_url,type,url,width,public_metrics'
  });

  const response = await fetch(
    `https://api.twitter.com/2/tweets?${queryParams}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_API_KEY}`
      }
    }
  );

  const tweets = await response.json();

  const getAuthorInfo = (author_id) => {
    return tweets.includes.users.find((user) => user.id === author_id);
  };

  const getReferencedTweets = (mainTweet) => {
    return (
      mainTweet?.referenced_tweets?.map((referencedTweet) => {
        const fullReferencedTweet = tweets.includes.tweets.find(
          (tweet) => tweet.id === referencedTweet.id
        );

        return {
          type: referencedTweet.type,
          author: getAuthorInfo(fullReferencedTweet.author_id),
          ...fullReferencedTweet
        };
      }) || []
    );
  };

  return (
    tweets.data?.reduce((allTweets, tweet) => {
      const tweetWithAuthor = {
        ...tweet,
        media:
          tweet?.attachments?.media_keys.map((key) =>
            tweets.includes.media.find((media) => media.media_key === key)
          ) || [],
        referenced_tweets: getReferencedTweets(tweet),
        author: getAuthorInfo(tweet.author_id)
      };

      return [tweetWithAuthor, ...allTweets];
    }, []) || [] // If the Twitter API key isn't set, don't break the build
  );
};
