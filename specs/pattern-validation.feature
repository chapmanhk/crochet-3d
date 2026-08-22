@e2e
Feature: Pattern validation
  As a crocheter
  I want clear feedback when I try an invalid action
  So that I understand what to do next

  Background:
    Given I am using the crochet pattern designer

  Scenario: Cannot add single crochet without a foundation chain
    Given I have no pattern
    When I choose "Add SC"
    Then I should see an error "Add a foundation chain before placing single crochet stitches."

  Scenario: Cannot start a new row before the current row is complete
    Given I have a foundation chain of 3
    And I am on row 1
    And I have placed 1 single crochet stitch on the current row
    When I choose "New Row"
    Then I should see an error "Complete row 1 before starting a new row"

  @engine
  Scenario: Cannot start a new row with no stitches on the current row
    Given I have a foundation chain of 3
    And I am on row 1
    And I have placed 0 single crochet stitches on the current row
    When I try to start a new row
    Then the operation should be rejected
