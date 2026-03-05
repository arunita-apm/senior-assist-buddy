import posthog from "posthog-js";

export const initPostHog = () => {
  posthog.init("phc_l52yVql6JIevl9NfmKK1De03JTC01ONtLS9cB24WA7i", {
    api_host: "https://us.i.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
  });
};

export { posthog };
