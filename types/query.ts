export interface tQuery {
  id: string,
  from: {
    id: number,
    is_bot: boolean,
    first_name: string,
    last_name: string,
    username: string,
    language_code: string
  },
  message: {
    message_id: number,
    from: {
      id: number,
      is_bot: boolean,
      first_name: string,
      username: string
    },
    chat: {
      id: number,
      first_name: string,
      last_name: string,
      username: string,
      type: string
    },
    date: number,
    text: string,
    reply_markup?
  },
  chat_instance: string,
  data: string
}

export interface tMessage {
  message_id: number,
  from: {
    id: number,
    is_bot: boolean,
    first_name: string,
    last_name: string,
    username: string,
    language_code: string
  },
  chat: {
    id: number,
    first_name: string,
    last_name: string,
    username: string,
    type: string
  },
  date: number,
  text: string,
  entities: [{ offset: number, length: number, type: string }]
}