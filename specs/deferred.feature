# Deferred behavior scenarios
# These are on the product roadmap (ROADMAP.md) but not yet scheduled for implementation.
# Remove @deferred from a scenario when starting work; add Playwright/Vitest proof in the same PR.

@deferred
Feature: Deferred product capabilities
  As a product owner
  I want future behavior captured in specs
  So that implementation starts with agreed acceptance criteria

  Background:
    Given I am using the crochet pattern designer

  @deferred @e2e
  Scenario: First-run onboarding explains how to start a pattern
    Given I am opening the app for the first time
    When the onboarding modal appears
    Then I should see guidance to create a foundation chain

  @deferred @e2e
  Scenario: Reset with no pattern is a no-op
    Given I have no pattern
    When I choose "Reset"
    Then the pattern status should be "No pattern"

  @deferred @e2e
  Scenario: Click an attachment point to place the next single crochet
    Given I have a foundation chain of 3
    And I am on row 1
    When I click an attachment point in the 3D canvas
    Then the stitch count should increase by 1

  @deferred @engine
  Scenario: Saved pattern round-trips through JSON export and import
    Given I have a foundation chain of 2 with one completed row
    When I export the pattern to JSON
    And I import the same JSON into a new session
    Then the stitch count should match the original pattern
