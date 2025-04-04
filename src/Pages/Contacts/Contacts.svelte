<script>
  import { onMount, tick } from "svelte";
  import { push } from "svelte-spa-router";
  import Spinner from "../../Components/Spinner/Spinner.svelte";
  import { currentContact } from "../../Store/store";
  import "./style.css";

  let contacts = [];
  let loading = false;

  let contactRefs = [];
  let currentId = 0;

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
      await tick();
      if (contactRefs[currentId]) {
        contactRefs[currentId].focus();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      currentId + 1 >= contactRefs.length ? (currentId = 0) : (currentId += 1);
      contactRefs[currentId].focus();
    } else if (e.key === "ArrowUp") {
      currentId - 1 < 0 ? (currentId = 0) : (currentId -= 1);
      contactRefs[currentId].focus();
    }
  };

  onMount(() => {
    fetchData();
    // contactRefs[currentId].focus();
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
    {#each contacts as contact, index}
      <div
        bind:this={contactRefs[index]}
        class="contact"
        tabindex="0"
        role="button"
      >
        <div class="userDetails">
          <i class="fa-solid fa-circle-user profile"></i>
          <h6 class="uname">{contact.contact_name}</h6>
        </div>

        <div class="icons">
          <button
            class="chatBtn"
            on:click={() => {
              currentContact.set(contact);
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
