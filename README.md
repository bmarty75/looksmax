# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Base de données (Supabase)

L'application a besoin d'un projet Supabase. Copie `.env.example` en `.env` et
renseigne l'URL et la clé « anon » (Settings → API), puis exécute **dans l'ordre**
les deux fichiers de `supabase/` depuis le SQL Editor :

| Fichier | Rôle |
| --- | --- |
| `schema.sql` | table `user_data` — les données privées de chaque compte |
| `social.sql` | tables `profiles` et `friendships` — la couche amis |

Les deux fichiers sont ré-exécutables : les relancer ne casse ni ne duplique rien.

`user_data` n'est jamais ouverte aux autres comptes. Le social repose sur un
instantané séparé que chacun publie dans `profiles`, dont le contenu dépend des
réglages « Visible par mes amis » du profil, et que seuls les amis acceptés
peuvent lire.

La clé « anon » est publique par construction : elle est embarquée dans le
bundle. C'est la RLS qui protège les données. La clé `service_role`, elle, ne
doit jamais se retrouver dans une variable `EXPO_PUBLIC_*`.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
