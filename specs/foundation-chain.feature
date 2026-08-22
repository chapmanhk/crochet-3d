@e2e
Feature: Foundation chain
  As a crocheter
  I want to start my pattern with a foundation chain
  So that I have a base to work subsequent rows into

  Background:
    Given I am using the crochet pattern designer

  Scenario: Create a foundation chain
    Given I have no pattern
    When I choose "New Chain" and enter 3
    Then the pattern status should be "Foundation"
    And the stitch count should be 3
    And the foundation length should be 3
    And the instructions should include "Foundation: ch 3"

  Scenario: Invalid chain length shows an error
    Given I have no pattern
    When I choose "New Chain" and enter "abc"
    Then I should see an error "Enter a whole number for chain length."

  @engine
  Scenario: Chain length must be within allowed bounds
    Given I have no pattern
    When I try to create a foundation chain of 0
    Then the operation should be rejected
    When I try to create a foundation chain of 501
    Then the operation should be rejected

  @engine
  Scenario: Cannot create a second foundation chain without reset
    Given I have a foundation chain of 3
    When I try to create another foundation chain of 5
    Then the operation should be rejected
