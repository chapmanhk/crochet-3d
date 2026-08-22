@e2e
Feature: Foundation chain
  As a crocheter
  I want to start my pattern with a foundation chain
  So that I have a base to work subsequent rows into

  Background:
    Given I am using the crochet pattern designer

  Scenario: Create a foundation chain
    Given I have no pattern
    When I choose "New Chain" and enter 3 in the chain length dialog
    Then the pattern status should be "Foundation"
    And the stitch count should be 3
    And the foundation length should be 3
    And the instructions should include "Foundation: ch 3"

  @e2e
  Scenario: Chain length dialog accepts numbers only
    Given I have no pattern
    When I open the new chain dialog
    And I try to enter "abc" in the chain length field
    Then the chain length field should contain only numbers

  @e2e
  Scenario: Out-of-range chain length shows an error in the dialog
    Given I have no pattern
    When I open the new chain dialog
    And I enter 501 in the chain length field
    And I choose "Create chain"
    Then I should see an error "Chain length must be between 1 and 500."

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
