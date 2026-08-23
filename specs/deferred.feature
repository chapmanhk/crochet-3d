# Deferred product capabilities
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
  Scenario: Reset with no pattern is a no-op
    Given I have no pattern
    When I choose "Reset"
    Then the pattern status should be "No pattern"

  @deferred @engine
  Scenario: Saved pattern round-trips through JSON export and import
    Given I have a foundation chain of 2 with one completed row
    When I export the pattern to JSON
    And I import the same JSON into a new session
    Then the stitch count should match the original pattern
