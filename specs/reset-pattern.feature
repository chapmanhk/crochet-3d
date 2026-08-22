@e2e
Feature: Reset pattern
  As a crocheter
  I want to clear my current pattern and start over
  So that I can try a different design

  Background:
    Given I am using the crochet pattern designer

  Scenario: Reset clears an existing pattern
    Given I have a foundation chain of 2
    When I choose "Reset" and confirm
    Then the pattern status should be "No pattern"
    And the stitch count should be 0
    And I should see guidance to "Start with a foundation chain."

  @deferred
  Scenario: Reset with no pattern is a no-op
    Given I have no pattern
    When I choose "Reset"
    Then the pattern status should be "No pattern"
