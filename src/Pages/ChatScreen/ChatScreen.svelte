<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";

  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      push("/contacts");
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });
</script>

<p>Chat screen page works!</p>
