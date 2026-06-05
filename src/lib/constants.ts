// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

export const LOCALSTORAGE_KEY = "dployr-cluster-id";

export const AVATARS = [
  { src: "/img/chess.png", alt: "chess" },
  { src: "/img/circle.png", alt: "circle" },
  { src: "/img/compass.png", alt: "compass" },
  { src: "/img/hash.png", alt: "hash" },
  { src: "/img/pause.png", alt: "pause" },
  { src: "/img/play.png", alt: "play" },
  { src: "/img/puzzle.png", alt: "puzzle" },
  { src: "/img/rocket.png", alt: "rocket" },
  { src: "/img/sphere.png", alt: "sphere" },
  { src: "/img/target.png", alt: "target" },
] as const;

export const APP_LINKS = {
  DOCS: {
    ROOT: "https://dployr.io/docs",
    DEPLOYMENTS: "https://dployr.io/docs/dashboard",
    ENV_VARS: "https://dployr.io/docs/env-vars",
  },
  HOME: "https://dployr.io",
  LEGAL: {
    TERMS: "https://dployr.io/legal/terms-of-service",
    PRIVACY: "https://dployr.io/legal/privacy-policy",
  },
  CHANGELOG: "https://dployr.io/changelog",
};
