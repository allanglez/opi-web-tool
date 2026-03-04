<template>
  <div class="min-h-screen bg-black px-4 py-8 sm:px-6 sm:py-10">
    <div class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center justify-center">
      <section
        class="w-full max-w-2xl rounded-2xl border border-neutral-300 bg-[#f4f5f7] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:px-10 sm:py-10"
      >
        <div class="text-center">
          <img
            src="../../assets/branding/myyukon-logo.png"
            alt="MyYukon"
            class="mx-auto h-14 w-auto sm:h-16"
            @error="handleLogoError"
          />
          <h1 class="mt-8 text-5xl font-bold leading-none text-[#141d33]">Log in</h1>
          <p class="mt-5 text-3xl leading-snug text-[#3c495d]">
            Log in with <span class="font-bold">MyYukon</span> to continue to
            <span class="font-semibold text-[#0d6972]">OPI Assessment Tool.</span>
          </p>
        </div>

        <form class="mt-8" @submit.prevent="loginWithAuth0">
          <label class="block text-xl font-semibold text-[#4a5568]" for="email-address">Email address*</label>
          <input
            id="email-address"
            v-model.trim="emailAddress"
            type="email"
            placeholder="Email address*"
            class="mt-3 w-full rounded-lg border border-neutral-300 bg-white px-5 py-4 text-2xl text-neutral-700 placeholder:text-neutral-400 focus:border-[#0d6972] focus:outline-none focus:ring-2 focus:ring-[#0d6972]/20"
            autocomplete="email"
          />
          <p class="mt-2 text-lg text-neutral-500">Use @evaluator.com or @coordinator.com</p>

          <button
            data-testid="auth0-continue"
            type="submit"
            class="mt-6 w-full rounded-lg bg-[#0b6974] px-5 py-4 text-3xl font-semibold text-white transition hover:bg-[#095964]"
          >
            Continue
          </button>
        </form>

        <p class="mt-6 text-center text-2xl text-[#3c495d]">
          Don't have an account?
          <span class="font-semibold text-[#0d6972]">Create an account</span>
        </p>

        <div class="my-6 flex items-center gap-4">
          <span class="h-px flex-1 bg-neutral-300" />
          <span class="text-xl font-semibold tracking-[0.2em] text-neutral-500">OR</span>
          <span class="h-px flex-1 bg-neutral-300" />
        </div>

        <button
          data-testid="auth0-staff-login"
          type="button"
          class="flex w-full items-center justify-center gap-4 rounded-lg border border-neutral-300 bg-neutral-50 px-5 py-4 text-left transition hover:bg-neutral-100"
          @click="loginWithAuth0"
        >
          <span class="relative inline-flex h-8 w-8 items-center justify-center">
            <span class="h-4 w-4 rotate-45 rounded-[3px] bg-[#f0bf2f]" />
            <span class="absolute left-[5px] top-[14px] h-4 w-4 rotate-45 rounded-[3px] bg-[#79b54a]" />
          </span>
          <span>
            <span class="block text-2xl font-semibold text-[#3c495d]">Continue with staff login</span>
            <span class="block text-lg text-neutral-500">(government only)</span>
          </span>
        </button>

        <div
          v-if="isMockMode"
          class="mt-8 rounded-xl border border-yellow-300 bg-yellow-50 p-4"
        >
          <p class="text-sm font-semibold text-yellow-800">Development Mode - Mock Auth</p>
          <div class="mt-3 grid gap-2 sm:grid-cols-3">
            <button
              data-testid="mock-login-admin"
              type="button"
              class="rounded bg-yukon-navy px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-yukon-teal"
              @click="mockLogin(1)"
            >
              Login as Admin
            </button>
            <button
              data-testid="mock-login-coordinator"
              type="button"
              class="rounded bg-yukon-navy px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-yukon-teal"
              @click="mockLogin(2)"
            >
              Login as Coordinator
            </button>
            <button
              data-testid="mock-login-evaluator"
              type="button"
              class="rounded bg-yukon-navy px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-yukon-teal"
              @click="mockLogin(3)"
            >
              Login as Evaluator
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useAuth0 } from '@auth0/auth0-vue';
import { isAuth0Mode, isMockAuthMode } from '../../auth/mode';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { loginWithRedirect } = useAuth0();
const emailAddress = ref('');

const isMockMode = isMockAuthMode;
const isAuth0AuthMode = isAuth0Mode;

const mockLogin = async (userId: number) => {
  try {
    await authStore.fetchMe(userId);

    // Redirect to original destination or dashboard
    const redirect = (route.query.redirect as string) || authStore.getDefaultRoute();
    router.push(redirect);
  } catch (error) {
    console.error('Mock login error:', error);
    alert('Login failed. Please try again.');
  }
};

const loginWithAuth0 = async () => {
  if (!isAuth0AuthMode) {
    return;
  }

  const redirect = route.query.redirect as string | undefined;
  if (redirect) {
    sessionStorage.setItem('auth_redirect', redirect);
  } else {
    sessionStorage.removeItem('auth_redirect');
  }

  const loginHint = emailAddress.value.trim();

  try {
    await loginWithRedirect(
      loginHint
        ? {
            authorizationParams: {
              login_hint: loginHint,
            },
          }
        : undefined
    );
  } catch (error) {
    console.error('Auth0 login error:', error);
    alert('Unable to start login. Please try again.');
  }
};

const handleLogoError = (event: Event) => {
  (event.target as HTMLImageElement).style.visibility = 'hidden';
};
</script>
