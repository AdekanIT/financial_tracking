

def calculate_profit_and_margin(broker_price, driver_pay):
    profit = broker_price - driver_pay
    margin = (profit / broker_price) * 100 if broker_price else 0
    return round(profit, 2), round(margin, 2)