<template>
  <div class="min-h-screen flex flex-col bg-white">
    <AppHeader
      :show-guest-login="true"
      guest-login-label="Login with MyYukon"
      @login="loginWithAuth0"
    />

    <main class="flex-1 w-full max-w-[1280px] mx-auto px-4 md:px-6 py-10 md:py-12">
      <section class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div class="max-w-3xl pt-6 md:pt-10">
          <h1 class="text-3xl md:text-[2.5rem] font-bold tracking-tight text-[#141d33]">
            Oral Proficiency Interview (OPI)
          </h1>
          <p class="mt-3 max-w-2xl text-base md:text-lg text-neutral-700">
            Online tool for french language programs assessment processes in Yukon Schools
          </p>
        </div>

        <section
          v-if="isMockMode"
          class="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,63,82,0.08)]"
        >
          <img
            src="../../assets/branding/myyukon-logo.png"
            alt="MyYukon"
            class="h-12 w-auto"
            @error="handleLogoError"
          />

          <h2 class="mt-6 text-2xl font-bold text-[#141d33]">Login</h2>
          <p class="mt-2 text-sm leading-6 text-neutral-600">
            Use your MyYukon account to access the OPI Assessment Tool.
          </p>

          <form class="mt-6 space-y-4" @submit.prevent="loginWithAuth0">
            <div>
              <label class="block text-sm font-semibold text-neutral-700" for="email-address">Email address</label>
              <input
                id="email-address"
                v-model.trim="emailAddress"
                type="email"
                placeholder="name@gov.yk.ca"
                class="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-800 placeholder:text-neutral-400 focus:border-yukon-teal focus:outline-none focus:ring-2 focus:ring-yukon-teal/20"
                autocomplete="email"
              />
            </div>

            <button
              data-testid="auth0-continue"
              type="submit"
              class="inline-flex w-full items-center justify-center rounded-lg bg-[#0f3f52] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0c3444]"
            >
              Login with MyYukon
            </button>
          </form>

          <p class="mt-4 text-xs leading-5 text-neutral-500">
            You’ll be redirected to the Yukon single sign-on experience to continue securely.
          </p>

          <div
            v-if="isMockMode"
            class="mt-6 rounded-xl border border-yellow-300 bg-yellow-50 p-4"
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
      </section>
    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { loginWithAuth0Redirect } from '../../auth/auth0';
import { isAuth0Mode, isMockAuthMode } from '../../auth/mode';
import AppHeader from '../../components/layout/AppHeader.vue';
import AppFooter from '../../components/layout/AppFooter.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const emailAddress = ref('');

const isMockMode = isMockAuthMode;
const isAuth0AuthMode = isAuth0Mode;

const mockLogin = async (userId: number) => {
  try {
    await authStore.fetchMe(userId);
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
    await loginWithAuth0Redirect(
      loginHint
        ? {
            authorizationParams: {
              login_hint: loginHint,
            },
          }
        : undefined,
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
