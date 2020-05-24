import React from "react";
import { useStatus } from 'react-monetize';

function MoneyViewer() {
    const { state, events } = useStatus()

    return (
        <>
            <p>State: {state}</p>
            <ul>
                {events.map((e) => (
                    <li key={e.timeStamp}>{`${e.detail.amount} ${e.detail.assetCode}/${e.detail.assetScale} ${JSON.stringify(e.detail)}`}</li>
                ))}
            </ul>
        </>
    );
}

export default MoneyViewer;