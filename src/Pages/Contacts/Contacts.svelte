<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import Spinner from "../../Components/Spinner/Spinner.svelte";
  import "./style.css";

  let contacts = [];
  $: loading = false;
  let currentContact = "";
  $: contactRefs = [];

  const fetchData = async () => {
    loading = true;
    const link = "/api/util/v1/fetchContactsList";
    const headers = {
      Authorization: `Basic ${btoa("+919600816183:ecrio@123")}`,
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    };

    try {
      const response = await fetch(link, {
        method: "GET",
        headers: headers,
      }).then((res) => res.json());
      contacts = response.contacts_list;
      contacts.sort((a, b) => a.contact_name.localeCompare(b.contact_name));
      loading = false;
    } catch (error) {
      console.log("Error fetching contacts", error);
      loading = false;
    }
  };

  const handleKeyDown = (e) => {
    // if (e.key === "ArrowLeft") {
    //   push("/");
    // } else if (e.key === "ArrowRight") {
    //   push("/chatscreen");
    // }
  };

  onMount(() => {
    fetchData();
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });
</script>

<div class="contacts">
  {#if loading}
    <Spinner />
  {:else}
    {#each contacts as { contact_name, contact_id }, index}
      <div bind:this={contactRefs[index]} class="contact">
        <div class="userDetails">
          <i class="fa-solid fa-circle-user profile"></i>
          <h6 class="uname">{contact_name}</h6>
        </div>

        <div class="icons">
          <button
            class="chatBtn"
            on:click={() => {
              currentContact = contact_id;
              push("/chatscreen");
            }}
          >
            <i class="fa-solid fa-message"></i>
          </button>
          <button class="edit">
            <i class="fa-solid fa-pen"></i>
          </button>
        </div>
      </div>
    {/each}
  {/if}
</div>
