<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import TextBox from "../../Components/TextBox/TextBox.svelte";
  import "./style.css";

  $: formData = {
    uname: "",
    password: "",
    phoneNum: "",
    serverIP: "",
    port: "",
  };
  $: inputs = [
    {
      key: "uname",
      placeholder: "Username",
    },
    {
      key: "password",
      placeholder: "Password",
    },
    {
      key: "phoneNum",
      placeholder: "Phone Number",
    },
    {
      key: "serverIP",
      placeholder: "Server Address",
    },
    {
      key: "port",
      placeholder: "Port",
    },
  ];
  let show = false;
  $: currentId = 0;
  $: inputRefs = [];

  const validate = () => {
    // checking for empty values
    if (
      formData.uname.trim() !== "" &&
      formData.password.trim() !== "" &&
      formData.phoneNum.trim() !== "" &&
      formData.serverIP.trim() !== "" &&
      formData.port.trim() !== ""
    ) {
      // checking for proper characters
      const phoneregex = /^[+]?[0-9]+$/;
      const ipregex = /^(?:\d+\.)*\d+$/;
      const portregex = /^[0-9]+$/;

      if (
        phoneregex.test(formData.phoneNum) &&
        formData.phoneNum.length === 13 &&
        ipregex.test(formData.serverIP) &&
        portregex.test(formData.port)
      ) {
        Login();
      } else {
        alert("Please fill valid data");
      }
    } else {
      alert("Please fill all the fields");
    }
  };

  const Login = () => {
    push("/contacts");
  };

  // Handling D-pad events
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      currentId + 1 >= inputRefs.length ? (currentId = 0) : (currentId += 1);
      inputRefs[currentId].focus();
    } else if (e.key === "ArrowUp") {
      currentId - 1 < 0 ? (currentId = 0) : (currentId -= 1);
      inputRefs[currentId].focus();
    }
  };

  // Listening D-pad key events
  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    inputRefs[currentId].focus();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });
</script>

<main>
  <div class="wrapper">
    <img src="./assets/ecriologo.png" alt="Ecrio logo" class="logo" />
    <div class="inputWrapper">
      <!-- Iterating the input fields -->

      {#each inputs as { key, placeholder }}
        <!-- Normal text fields -->
        {#if key !== "password"}
          <TextBox
            value={formData[key]}
            type="text"
            bind:ref={inputRefs[inputRefs.length]}
            {placeholder}
            className="loginInput"
            onInput={(e) => {
              formData[key] = e.target.value;
            }}
          />
        {:else}
          <!-- Password field -->
          <div class="passwordWrapper">
            <TextBox
              value={formData[key]}
              type={show ? "text" : "password"}
              bind:ref={inputRefs[inputRefs.length]}
              {placeholder}
              className="loginInput"
              onInput={(e) => {
                formData[key] = e.target.value;
              }}
            />
            <!-- Show/Hide password button -->
            <button
              bind:this={inputRefs[inputRefs.length]}
              on:click={() => {
                show = !show;
              }}
              class="iconbtn"
            >
              {#if show}
                <i class="fa-solid fa-eye-slash"></i>
              {:else}
                <i class="fa-solid fa-eye"></i>
              {/if}
            </button>
          </div>
        {/if}
      {/each}
    </div>

    <!-- Login button -->
    <button
      bind:this={inputRefs[6]}
      type="button"
      on:click={validate}
      class="loginBtn"
    >
      Login
    </button>
  </div>
</main>
