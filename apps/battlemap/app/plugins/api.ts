export default defineNuxtPlugin(() => {
  const api = $fetch.create({
    baseURL: "http://localhost:3000", // your Nest backend
  });

  return {
    provide: {
      api,
    },
  };
});
