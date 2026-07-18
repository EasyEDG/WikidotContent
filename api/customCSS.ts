declare interface PagesFunctionContext {
    request: Request;
    env: Record<string, string>;
    params: Record<string, string>;
    next: () => Promise<Response>;
}

declare type PagesFunction = (
    context: PagesFunctionContext
) => Response | Promise<Response>;


export const onRequest: PagesFunction = async (context) => {
    const url = new URL(context.request.url);
    const type = url.searchParams.get('type') || '';
    const timeStr = url.searchParams.get('time') || '';
    const conditionVar = url.searchParams.get('condition') || '';
    const routineCss = url.searchParams.get('routineCss') || '';
    const specificCss = url.searchParams.get('specificCss') || '';

    if (!routineCss || !specificCss) {
        if (!routineCss && specificCss) {
            return new Response(
                JSON.stringify({ error: 'Invalid link! routineCss parameter does not exist!' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        } else if (routineCss && !specificCss) {
            return new Response(
                JSON.stringify({ error: 'Invalid link! specificCss parameter does not exist!' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        } else {
            return new Response(
                JSON.stringify({ error: 'Invalid link! routineCss parameter and specificCss parameter do not exist!' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
    }

    const isValidUrl = (str: string) =>
        str.startsWith('https://') || str.startsWith('http://');

    if (!isValidUrl(routineCss) || !isValidUrl(specificCss)) {
        if (!isValidUrl(routineCss) && isValidUrl(specificCss)) {
            return new Response(
                JSON.stringify({ error: 'Invalid link! routineCss parameter only supports HTTPS or HTTP scheme links!' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        } else if (isValidUrl(routineCss) && !isValidUrl(specificCss)) {
            return new Response(
                JSON.stringify({ error: 'Invalid link! specificCss parameter only supports HTTPS or HTTP scheme links!' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        } else {
            return new Response(
                JSON.stringify({ error: 'Invalid link! routineCss parameter and specificCss parameter only supports HTTPS or HTTP scheme links!' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
    }

    let selectedCssUrl = routineCss;

    if (type === 'date' && timeStr) {
        const [datePart, timePart] = timeStr.split('|');
        const now = new Date();
        type Condition = 
         | 'current-time-and-herebefore'
         | 'current-time'
         | 'herebefore-time'
         | 'current-time-and-hereafter'
         | 'hereafter-time'
         | 'except-for-the-current-time';
        function FisValidCondition (conditionVar: string): Condition {
            const CisValidCondition: Condition[] = [
                'current-time-and-herebefore',
                'current-time',
                'herebefore-time',
                'current-time-and-hereafter',
                'hereafter-time',
                'except-for-the-current-time',
            ];
            if (CisValidCondition.includes(conditionVar as Condition)) {
                return conditionVar as Condition;
            }
            return 'current-time';
        }
        const condition = FisValidCondition(conditionVar);
        if (datePart && timePart) { 
            const targetDate = new Date(`${datePart}T${timePart}Z`);
            if (!isNaN(targetDate.getTime())) {
                type ValidTime = (Now: number, TargetDate: number) => boolean;
                function FisCorrectCondition (condition: string, now: Date, targetDate: Date): boolean {
                    const conditionMap: Record<Condition, ValidTime> = {
                        'current-time-and-herebefore': (Now, TargetDate) => Now <= TargetDate,
                        'current-time':                (Now, TargetDate) => Now === TargetDate,
                        'herebefore-time':             (Now, TargetDate) => Now < TargetDate,
                        'current-time-and-hereafter':  (Now, TargetDate) => Now >= TargetDate,
                        'hereafter-time':              (Now, TargetDate) => Now > TargetDate,
                        'except-for-the-current-time': (Now, TargetDate) => Now !== TargetDate,
                    }
                    if (!(condition in conditionMap)) {
                        return false;
                    }
                    return conditionMap[condition as Condition](now.getTime(), targetDate.getTime());
                }
                const CisCorrectCondition = FisCorrectCondition(condition, now, targetDate);
                if (CisCorrectCondition) {
                    selectedCssUrl = specificCss;
                }
            }
        } else if (datePart && !timePart) {
            const endOfDay = new Date(`${datePart}T23:59:59Z`);
            const startOfDay = new Date(`${datePart}T00:00:00Z`);
            if (!isNaN(endOfDay.getTime()) && !isNaN(startOfDay.getTime())) {
                type ValidTime = (Now: number, EndOfDay: number, StartOfDay: number) => boolean;
                function FisCorrectCondition (condition: string, now: Date, endOfDay: Date, startOfDay: Date): boolean {
                    const conditionMap: Record<Condition, ValidTime> = {
                        'current-time-and-herebefore': (Now, EndOfDay) => Now <= EndOfDay,
                        'current-time':                (Now, EndOfDay, StartOfDay) => StartOfDay <= Now && Now <= EndOfDay,
                        'herebefore-time':             (Now, StartOfDay) => Now < StartOfDay,
                        'current-time-and-hereafter':  (Now, StartOfDay) => Now >= StartOfDay,
                        'hereafter-time':              (Now, EndOfDay) => Now > EndOfDay,
                        'except-for-the-current-time': (Now, EndOfDay, StartOfDay) => Now < StartOfDay || Now > EndOfDay,
                    }
                    if (!(condition in conditionMap)) {
                        return false;
                    }
                    return conditionMap[condition as Condition](now.getTime(), endOfDay.getTime(), startOfDay.getTime());
                }
                const CisCorrectCondition = FisCorrectCondition(condition, now, endOfDay , startOfDay);
                if (CisCorrectCondition) {
                    selectedCssUrl = specificCss;
                }
            }
        } else if (!datePart && timePart) {
            const fullYear = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const rawDate = now.getDate();
            const targetDate = new Date(`${fullYear}-${month}-${rawDate}T${timePart}Z`);
            if (!isNaN(targetDate.getTime())) {
                type ValidTime = (Now: number, TargetDate: number) => boolean;
                function FisCorrectCondition (condition: string, now: Date, targetDate: Date): boolean {
                    const conditionMap: Record<Condition, ValidTime> = {
                        'current-time-and-herebefore': (Now, TargetDate) => Now <= TargetDate,
                        'current-time':                (Now, TargetDate) => Now === TargetDate,
                        'herebefore-time':             (Now, TargetDate) => Now < TargetDate,
                        'current-time-and-hereafter':  (Now, TargetDate) => Now >= TargetDate,
                        'hereafter-time':              (Now, TargetDate) => Now > TargetDate,
                        'except-for-the-current-time': (Now, TargetDate) => Now !== TargetDate,
                    }
                    if (!(condition in conditionMap)) {
                        return false;
                    }
                    return conditionMap[condition as Condition](now.getTime(), targetDate.getTime());
                }
                const CisCorrectCondition = FisCorrectCondition(condition, now, targetDate);
                if (CisCorrectCondition) {
                    selectedCssUrl = specificCss;
                }
            }
        }
            
    }
    

    let cssResponse: Response;
    try {
        cssResponse = await fetch(selectedCssUrl);
    } catch (err) {
        return new Response(
            JSON.stringify({ error: 'Custom CSS Error! Failed to fetch CSS from the selected URL.' }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
    }

    if (!cssResponse.ok) {
        return new Response(
            `Custom CSS Error! Failed to load CSS from ${selectedCssUrl}`,
            { status: 502 }
        );
    }

    const cssContent = await cssResponse.text();

    return new Response(cssContent, {
        headers: {
            'Content-Type': 'text/css; charset=utf-8',
            'Cache-Control': 'public, max-age=604800',
            'Access-Control-Allow-Origin': '*',
        },
    });
};