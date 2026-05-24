// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { OnboardingModal } from "@/components/onboarding-modal";
import type { User } from "@/types";

const mockUpdateProfile = vi.fn();
const mockRenameCluster = { mutateAsync: vi.fn() };
const mockUpdateMetadata = { mutateAsync: vi.fn() };

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mockUser(),
    updateProfile: mockUpdateProfile,
  }),
}));

vi.mock("@/hooks/use-clusters", () => ({
  useClusters: () => ({
    userCluster: mockCluster(),
    renameCluster: mockRenameCluster,
    updateMetadata: mockUpdateMetadata,
  }),
}));

const NOW = Date.now();
const ONE_HOUR_AGO = NOW - 1 * 60 * 60 * 1000;
const TWO_DAYS_AGO = NOW - 48 * 60 * 60 * 1000;

// Default: a brand-new user whose name + cluster match their email prefix
let _user: User = {
  id: "u1",
  email: "alice@example.com",
  name: "alice", // matches email prefix → new user
  createdAt: ONE_HOUR_AGO,
  updatedAt: ONE_HOUR_AGO,
};
let _clusterName = "alice"; // matches email prefix → new user

function mockUser() { return _user; }
function mockCluster() { return { id: "c1", name: _clusterName }; }

function setUser(overrides: Partial<User>) { _user = { ..._user, ...overrides }; }
function setClusterName(name: string) { _clusterName = name; }

function resetToNewUser() {
  _user = {
    id: "u1",
    email: "alice@example.com",
    name: "alice",
    createdAt: ONE_HOUR_AGO,
    updatedAt: ONE_HOUR_AGO,
  };
  _clusterName = "alice";
}

beforeEach(() => {
  resetToNewUser();
  vi.clearAllMocks();
  mockUpdateProfile.mockResolvedValue(undefined);
  mockRenameCluster.mutateAsync.mockResolvedValue(undefined);
  mockUpdateMetadata.mutateAsync.mockResolvedValue(undefined);
});

describe("OnboardingModal — visibility", () => {
  it("shows for a brand-new user (name = email prefix, cluster = email prefix, age < 24 h)", () => {
    render(<OnboardingModal />);
    expect(screen.getByText("Set up your workspace")).toBeInTheDocument();
  });

  it("hidden when user's name has already been personalised", () => {
    setUser({ name: "Alice Smith" }); // no longer matches email prefix
    render(<OnboardingModal />);
    expect(screen.queryByText("Set up your workspace")).not.toBeInTheDocument();
  });

  it("hidden when the cluster name has already been renamed", () => {
    setClusterName("My Startup");
    render(<OnboardingModal />);
    expect(screen.queryByText("Set up your workspace")).not.toBeInTheDocument();
  });

  it("hidden when the account is older than 24 hours", () => {
    setUser({ createdAt: TWO_DAYS_AGO, updatedAt: TWO_DAYS_AGO });
    render(<OnboardingModal />);
    expect(screen.queryByText("Set up your workspace")).not.toBeInTheDocument();
  });

  it("hidden when name is missing but cluster has been renamed", () => {
    setUser({ name: undefined });
    setClusterName("Renamed Workspace");
    render(<OnboardingModal />);
    expect(screen.queryByText("Set up your workspace")).not.toBeInTheDocument();
  });
});


describe("OnboardingModal — step 1 (workspace setup)", () => {
  it("renders name and workspace name inputs pre-filled from user data", () => {
    render(<OnboardingModal />);
    expect(screen.getByLabelText(/your name/i)).toHaveValue("alice");
    expect(screen.getByLabelText(/workspace name/i)).toHaveValue("alice");
  });

  it("shows step counter '1 / 2'", () => {
    render(<OnboardingModal />);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("blocks advancing when name is cleared", () => {
    render(<OnboardingModal />);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(screen.queryByText("Tell us about yourself")).not.toBeInTheDocument();
  });

  it("blocks advancing when workspace name is cleared", () => {
    render(<OnboardingModal />);
    fireEvent.change(screen.getByLabelText(/workspace name/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/workspace name is required/i)).toBeInTheDocument();
  });

  it("clears the name error once the user starts typing again", () => {
    render(<OnboardingModal />);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "A" } });
    expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
  });

  it("advances to step 2 when required fields are filled", () => {
    render(<OnboardingModal />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Tell us about yourself")).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("cannot be dismissed with Escape", () => {
    render(<OnboardingModal />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByText("Set up your workspace")).toBeInTheDocument();
  });
});

describe("OnboardingModal — step 2 (tell us about yourself)", () => {
  function advanceToStep2() {
    render(<OnboardingModal />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
  }

  it("renders team size options", () => {
    advanceToStep2();
    expect(screen.getByRole("button", { name: "Just me" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2–5" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5+" })).toBeInTheDocument();
  });

  it("renders what-are-you-deploying options", () => {
    advanceToStep2();
    expect(screen.getByRole("button", { name: "Web service" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Static site" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Background worker" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not sure yet" })).toBeInTheDocument();
  });

  it("validates teamSize is required", () => {
    advanceToStep2();
    fireEvent.click(screen.getByRole("button", { name: "Let's go" }));
    expect(screen.getByText(/select your team size/i)).toBeInTheDocument();
  });

  it("validates firstDeploy is required", () => {
    advanceToStep2();
    fireEvent.click(screen.getByRole("button", { name: "Just me" }));
    fireEvent.click(screen.getByRole("button", { name: "Let's go" }));
    expect(screen.getByText(/select what you are deploying/i)).toBeInTheDocument();
  });

  it("validates source is required", () => {
    advanceToStep2();
    fireEvent.click(screen.getByRole("button", { name: "Just me" }));
    fireEvent.click(screen.getByRole("button", { name: "Web service" }));
    fireEvent.click(screen.getByRole("button", { name: "Let's go" }));
    expect(screen.getByText(/let us know how you found/i)).toBeInTheDocument();
  });

  it("Back button returns to step 1", () => {
    advanceToStep2();
    // Use exact label to avoid matching "Background worker"
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Set up your workspace")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("shows a free-text input when 'Other' is selected for source", () => {
    advanceToStep2();
    // The source select's placeholder is "Select source" — comboboxes are ordered:
    // [0] = "Moving away from?" (Select platform), [1] = "How did you find?" (Select source)
    const [, sourceSelect] = screen.getAllByRole("combobox");
    fireEvent.click(sourceSelect);
    fireEvent.click(screen.getByRole("option", { name: "Other" }));
    expect(screen.getByPlaceholderText(/where did you hear/i)).toBeInTheDocument();
  });

  it("shows a free-text input when 'Other' is selected for replacing", () => {
    advanceToStep2();
    const [replacingSelect] = screen.getAllByRole("combobox");
    fireEvent.click(replacingSelect);
    fireEvent.click(screen.getByRole("option", { name: "Other" }));
    expect(screen.getByPlaceholderText(/tell us what you're moving from/i)).toBeInTheDocument();
  });
});


describe("OnboardingModal — submission", () => {
  async function fillAndSubmit(opts: { renameWorkspace?: boolean } = {}) {
    render(<OnboardingModal />);

    if (opts.renameWorkspace) {
      fireEvent.change(screen.getByLabelText(/workspace name/i), { target: { value: "My New Workspace" } });
    }

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    fireEvent.click(screen.getByRole("button", { name: "Just me" }));
    fireEvent.click(screen.getByRole("button", { name: "Web service" }));
    // source select is [1] (after the "Moving away from?" select at [0])
    const [, sourceSelect] = screen.getAllByRole("combobox");
    fireEvent.click(sourceSelect);
    fireEvent.click(screen.getByRole("option", { name: "Google / web search" }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Let's go" }));
    });
  }

  it("calls updateProfile with the entered name on finish", async () => {
    await fillAndSubmit();
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ name: "alice" })
    );
  });

  it("does NOT call renameCluster when workspace name is unchanged", async () => {
    await fillAndSubmit();
    expect(mockRenameCluster.mutateAsync).not.toHaveBeenCalled();
  });

  it("calls renameCluster when workspace name is changed", async () => {
    await fillAndSubmit({ renameWorkspace: true });
    expect(mockRenameCluster.mutateAsync).toHaveBeenCalledWith("My New Workspace");
  });

  it("saves required metadata fields on finish", async () => {
    await fillAndSubmit();
    expect(mockUpdateMetadata.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        onboarding_team_size: "just-me",
        onboarding_first_deploy: "web-service",
        onboarding_source: "search",
        onboarding_completed_at: expect.any(String),
        onboarding_feedback_call: "false",
      })
    );
  });

  it("records feedback_call as true when checkbox is ticked", async () => {
    render(<OnboardingModal />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Just me" }));
    fireEvent.click(screen.getByRole("button", { name: "Web service" }));
    const [, sourceSelect] = screen.getAllByRole("combobox");
    fireEvent.click(sourceSelect);
    fireEvent.click(screen.getByRole("option", { name: "Google / web search" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /15.minute feedback call/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Let's go" }));
    });
    expect(mockUpdateMetadata.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ onboarding_feedback_call: "true" })
    );
  });

  it("encodes 'other' source with free text into metadata", async () => {
    render(<OnboardingModal />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Just me" }));
    fireEvent.click(screen.getByRole("button", { name: "Web service" }));
    const [, sourceSelect] = screen.getAllByRole("combobox");
    fireEvent.click(sourceSelect);
    fireEvent.click(screen.getByRole("option", { name: "Other" }));
    fireEvent.change(screen.getByPlaceholderText(/where did you hear/i), { target: { value: "colleague referral" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Let's go" }));
    });
    expect(mockUpdateMetadata.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ onboarding_source: "other (colleague referral)" })
    );
  });

  it("shows Saving... while the API calls are in flight", async () => {
    mockUpdateProfile.mockReturnValue(new Promise(() => {})); // never resolves
    render(<OnboardingModal />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Just me" }));
    fireEvent.click(screen.getByRole("button", { name: "Web service" }));
    const [, sourceSelect] = screen.getAllByRole("combobox");
    fireEvent.click(sourceSelect);
    fireEvent.click(screen.getByRole("option", { name: "Google / web search" }));
    fireEvent.click(screen.getByRole("button", { name: "Let's go" }));
    expect(await screen.findByRole("button", { name: /saving/i })).toBeDisabled();
  });
});
