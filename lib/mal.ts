const client_id = process.env.MAL_CLIENT_ID;
const client_secret = process.env.MAL_CLIENT_SECRET;
const refresh_token = process.env.MAL_REFRESH_TOKEN;

const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
const MAL_ENDPOINT = `https://api.myanimelist.net/v2/users/@me/animelist?fields=my_list_status{status,num_episodes_watched,score},media_type,num_episodes,status,main_picture{large}&limit=1000`;
const MAL_MANGA_ENDPOINT = `https://api.myanimelist.net/v2/users/@me/mangalist?fields=my_list_status{status,num_chapters_read,num_volumes_read,score},media_type,num_chapters,num_volumes,status,main_picture{large}&limit=1000`;
const MAL_STATS_ENDPOINT = `https://api.myanimelist.net/v2/users/@me?fields=anime_statistics`;
const TOKEN_ENDPOINT = `https://myanimelist.net/v1/oauth2/token`;

const getAccessToken = async () => {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token
    })
  });

  return response.json();
};

export const getMAL = async () => {
  const { access_token } = await getAccessToken();

  return fetch(MAL_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`
    }
  });
};

export const getMALStats = async () => {
  const { access_token } = await getAccessToken();

  return fetch(MAL_STATS_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`
    }
  });
};

export const getMALManga = async () => {
  const { access_token } = await getAccessToken();

  return fetch(MAL_MANGA_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`
    }
  });
};
