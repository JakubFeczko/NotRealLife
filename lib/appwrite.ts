import {Account, Client} from 'react-native-appwrite';

export const client = new Client();
export const account = new Account(client);