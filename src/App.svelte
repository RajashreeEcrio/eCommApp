<script>
  import Router from "svelte-spa-router";
  //   Pages
  import Login from "./Pages/Login/Login.svelte";
  import Contacts from "./Pages/Contacts/Contacts.svelte";
  import ChatScreen from "./Pages/ChatScreen/ChatScreen.svelte";

  //   Defining routes
  const routes = {
    "/": Login,
    "/contacts": Contacts,
    "/chatscreen": ChatScreen,
  };
</script>

<main>
  <Router {routes} />
</main>

<style>
</style>
